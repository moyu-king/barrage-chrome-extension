/**
 * 扩展消息类型（独立文件，避免 popup 导入 background 带来的副作用）
 */
export enum MessageType {
  GET_VIDEOS,
  CREATE_VIDEO,
  GET_EPISODES,
  GET_BARRAGES,
  GET_VIDEO_NAME,
  GET_VIDEO_EMOJI,
  DELETE_VIDEO,
  UPDATE_VIDEO,
  SYNC_CONTENT_DATA,
  SEARCH_VIDEO,
  /** popup → 内容脚本：弹出「添加当前页面」确认框（解析在页面里做，爱奇艺需要 DOM） */
  OPEN_ADD_PANEL,
}
