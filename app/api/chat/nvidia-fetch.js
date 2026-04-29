const encoder = new TextEncoder();
const decoder = new TextDecoder();

const SSE_DONE = '[DONE]';

export function nvidiaFetch(url, options) {
  const init = { ...options };

  if (typeof init.body === 'string') {
    try {
      const body = JSON.parse(init.body);
      body.chat_template_kwargs = {
        ...(body.chat_template_kwargs || {}),
        enable_thinking: true,
      };
      if (body.reasoning_budget == null) body.reasoning_budget = 16384;
      init.body = JSON.stringify(body);
    } catch {
      // ignore body that isn't JSON
    }
  }

  return fetch(url, init).then((response) => {
    const contentType = response.headers.get('content-type') || '';
    if (!response.body || !contentType.includes('event-stream')) {
      return response;
    }

    let buffer = '';
    let inThink = false;
    let thinkClosed = false;

    const stream = response.body.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          buffer += decoder.decode(chunk, { stream: true });

          let newlineIdx;
          const out = [];
          while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            out.push(rewriteLine(line));
          }
          if (out.length) {
            controller.enqueue(encoder.encode(out.join('\n') + '\n'));
          }
        },

        flush(controller) {
          if (buffer) {
            controller.enqueue(encoder.encode(rewriteLine(buffer)));
            buffer = '';
          }
          if (inThink && !thinkClosed) {
            const closer = {
              choices: [{ delta: { content: '</think>' }, index: 0 }],
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(closer)}\n\n`)
            );
          }
        },
      })
    );

    function rewriteLine(line) {
      if (!line.startsWith('data: ')) return line;
      const payload = line.slice(6).trim();
      if (!payload || payload === SSE_DONE) return line;
      try {
        const parsed = JSON.parse(payload);
        const choice = parsed.choices?.[0];
        const delta = choice?.delta;
        if (!delta) return line;

        const reasoning = delta.reasoning_content;
        if (typeof reasoning === 'string' && reasoning.length) {
          const opener = inThink ? '' : '<think>';
          inThink = true;
          delta.content = (delta.content ? delta.content : '') + opener + reasoning;
          delete delta.reasoning_content;
          return `data: ${JSON.stringify(parsed)}`;
        }

        if (typeof delta.content === 'string' && delta.content.length) {
          if (inThink && !thinkClosed) {
            delta.content = '</think>' + delta.content;
            thinkClosed = true;
          }
          return `data: ${JSON.stringify(parsed)}`;
        }

        if (choice.finish_reason && inThink && !thinkClosed) {
          delta.content = (delta.content || '') + '</think>';
          thinkClosed = true;
          return `data: ${JSON.stringify(parsed)}`;
        }

        return line;
      } catch {
        return line;
      }
    }

    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  });
}
