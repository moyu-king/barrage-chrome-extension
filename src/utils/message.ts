export type MsgParams = { type: string } & Record<string, any>

export function sendMsgToContent(params: MsgParams, cb?: (response: any) => void) {
  chrome.tabs.query(
    { active: true, currentWindow: true },
    ([tab]) => {
      cb ? chrome.tabs.sendMessage(tab.id!, params, cb) : chrome.tabs.sendMessage(tab.id!, params)
    },
  )
}
