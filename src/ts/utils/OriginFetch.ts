export interface OriginFetchResult {
  status: number
  ok: boolean
  headers: Record<string, string>
  body: string
}

interface OriginFetchRequest {
  type: 'ORIGIN_FETCH'
  id: string
  url: string
  options: RequestInit
}

interface OriginFetchResponse {
  type: 'ORIGIN_FETCH_RESULT'
  id: string
  data?: OriginFetchResult
  error?: string
}

// 注入 fetch 执行器到页面上下文
function injectPageScript(): void {
  const fn = () => {
    window.addEventListener('message', async (event: MessageEvent) => {
      if (event.source !== window) return
      const data = event.data
      if (!data || data.type !== 'ORIGIN_FETCH') return

      try {
        const res = await fetch(data.url, data.options)
        const body = await res.text()

        const headersObj: Record<string, string> = {}
        res.headers.forEach((value, key) => {
          headersObj[key] = value
        })

        const result = {
          status: res.status,
          ok: res.ok,
          headers: headersObj,
          body,
        }

        window.postMessage(
          { type: 'ORIGIN_FETCH_RESULT', id: data.id, data: result },
          '*'
        )
      } catch (err) {
        window.postMessage(
          { type: 'ORIGIN_FETCH_RESULT', id: data.id, error: String(err) },
          '*'
        )
      }
    })
  }

  const script = document.createElement('script')
  script.textContent = `(${fn})();`
  document.documentElement.appendChild(script)
  script.remove()
}

let injected = false
function ensureInjected() {
  if (!injected) {
    injectPageScript()
    injected = true
  }
}

/**
 * originFetch：以页面身份发起 fetch 请求
 */
export function originFetch(
  url: string,
  options: RequestInit = {}
): Promise<OriginFetchResult> {
  ensureInjected()

  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2)

    const handler = (event: MessageEvent) => {
      if (event.source !== window) return
      const message = event.data as OriginFetchResponse
      if (message?.type === 'ORIGIN_FETCH_RESULT' && message.id === id) {
        window.removeEventListener('message', handler)

        if (message.error) {
          reject(new Error(message.error))
        } else {
          resolve(message.data!)
        }
      }
    }

    window.addEventListener('message', handler)

    const request: OriginFetchRequest = {
      type: 'ORIGIN_FETCH',
      id,
      url,
      options,
    }
    window.postMessage(request, '*')
  })
}
