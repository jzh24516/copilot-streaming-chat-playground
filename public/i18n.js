(function () {
  'use strict';

  const STORAGE_KEY = 'streamingPlaygroundLanguage';

  const languages = {
    en: { label: 'English', htmlLang: 'en', webChatLocale: 'en-US' },
    'zh-CN': { label: '简体中文', htmlLang: 'zh-Hans', webChatLocale: 'zh-Hans' },
    'zh-TW': { label: '繁體中文', htmlLang: 'zh-Hant', webChatLocale: 'zh-Hant' },
    ja: { label: '日本語', htmlLang: 'ja', webChatLocale: 'ja-JP' },
    ko: { label: '한국어', htmlLang: 'ko', webChatLocale: 'ko-KR' }
  };

  const text = {
    // Shared shell
    'Language': {
      'zh-CN': '语言',
      'zh-TW': '語言',
      ja: '言語',
      ko: '언어'
    },
    'English': { 'zh-CN': '英语', 'zh-TW': '英文', ja: '英語', ko: '영어' },
    '简体中文': { 'zh-CN': '简体中文', 'zh-TW': '簡體中文', ja: '簡体字中国語', ko: '중국어 간체' },
    '繁體中文': { 'zh-CN': '繁体中文', 'zh-TW': '繁體中文', ja: '繁体字中国語', ko: '중국어 번체' },
    '日本語': { 'zh-CN': '日语', 'zh-TW': '日文', ja: '日本語', ko: '일본어' },
    '한국어': { 'zh-CN': '韩语', 'zh-TW': '韓文', ja: '韓国語', ko: '한국어' },

    // Playground static UI
    'Copilot Studio · Streaming Chat Playground': {
      'zh-CN': 'Copilot Studio · 流式聊天体验场',
      'zh-TW': 'Copilot Studio · 串流聊天體驗場',
      ja: 'Copilot Studio · ストリーミング チャット プレイグラウンド',
      ko: 'Copilot Studio · 스트리밍 채팅 플레이그라운드'
    },
    'Streaming Chat Playground': {
      'zh-CN': '流式聊天体验场',
      'zh-TW': '串流聊天體驗場',
      ja: 'ストリーミング チャット プレイグラウンド',
      ko: '스트리밍 채팅 플레이그라운드'
    },
    'Live-streaming responses from a Microsoft Copilot Studio agent · SDK Direct-to-Engine with Direct Line diagnostics': {
      'zh-CN': '来自 Microsoft Copilot Studio 智能体的实时流式回复 · SDK Direct-to-Engine 与 Direct Line 诊断',
      'zh-TW': '來自 Microsoft Copilot Studio 代理程式的即時串流回應 · SDK Direct-to-Engine 與 Direct Line 診斷',
      ja: 'Microsoft Copilot Studio エージェントからのライブ ストリーミング応答 · SDK Direct-to-Engine と Direct Line 診断',
      ko: 'Microsoft Copilot Studio 에이전트의 실시간 스트리밍 응답 · SDK Direct-to-Engine 및 Direct Line 진단'
    },
    'Tech Note Deck': { 'zh-CN': '技术说明演示文稿', 'zh-TW': '技術說明簡報', ja: '技術ノート デッキ', ko: '기술 노트 데크' },
    'Open the streaming tech note deck': {
      'zh-CN': '打开流式响应技术说明演示文稿',
      'zh-TW': '開啟串流回應技術說明簡報',
      ja: 'ストリーミング技術ノート デッキを開く',
      ko: '스트리밍 기술 노트 데크 열기'
    },
    'Not connected': { 'zh-CN': '未连接', 'zh-TW': '未連線', ja: '未接続', ko: '연결되지 않음' },
    'Connection': { 'zh-CN': '连接', 'zh-TW': '連線', ja: '接続', ko: '연결' },
    'Connection mode': { 'zh-CN': '连接模式', 'zh-TW': '連線模式', ja: '接続モード', ko: '연결 모드' },
    'Copilot Studio SDK · Direct-to-Engine (Entra sign-in · generative streaming)': {
      'zh-CN': 'Copilot Studio SDK · Direct-to-Engine（Entra 登录 · 生成式流式响应）',
      'zh-TW': 'Copilot Studio SDK · Direct-to-Engine（Entra 登入 · 生成式串流）',
      ja: 'Copilot Studio SDK · Direct-to-Engine（Entra サインイン · 生成ストリーミング）',
      ko: 'Copilot Studio SDK · Direct-to-Engine(Entra 로그인 · 생성형 스트리밍)'
    },
    'Server relay (secret stays server-side)': {
      'zh-CN': '服务器中继（密钥保留在服务器端）',
      'zh-TW': '伺服器轉送（密鑰留在伺服器端）',
      ja: 'サーバー リレー（シークレットはサーバー側に保持）',
      ko: '서버 릴레이(비밀은 서버 쪽에 유지)'
    },
    'Copilot Studio token endpoint URL': {
      'zh-CN': 'Copilot Studio 令牌终结点 URL',
      'zh-TW': 'Copilot Studio 權杖端點 URL',
      ja: 'Copilot Studio トークン エンドポイント URL',
      ko: 'Copilot Studio 토큰 엔드포인트 URL'
    },
    'Direct Line secret / token': { 'zh-CN': 'Direct Line 密钥 / 令牌', 'zh-TW': 'Direct Line 密鑰 / 權杖', ja: 'Direct Line シークレット / トークン', ko: 'Direct Line 비밀 / 토큰' },
    'Direct Line · live streaming (custom coalescing) · experimental': {
      'zh-CN': 'Direct Line · 实时流式响应（自定义合并）· 实验性',
      'zh-TW': 'Direct Line · 即時串流（自訂合併）· 實驗性',
      ja: 'Direct Line · ライブ ストリーミング（カスタム集約）· 試験的',
      ko: 'Direct Line · 실시간 스트리밍(사용자 지정 병합) · 실험적'
    },
    'No-auth agent · Agentic Direct Line (WebSocket diagnostic · may be final-only)': {
      'zh-CN': '无身份验证智能体 · Agentic Direct Line（WebSocket 诊断 · 可能仅返回最终消息）',
      'zh-TW': '無驗證代理程式 · Agentic Direct Line（WebSocket 診斷 · 可能僅傳回最終訊息）',
      ja: '認証なしエージェント · Agentic Direct Line（WebSocket 診断 · final のみの場合あり）',
      ko: '인증 없는 에이전트 · Agentic Direct Line(WebSocket 진단 · 최종 메시지만 반환할 수 있음)'
    },
    'Published-bot DTE · isolated diagnostic (standard harness)': { 'zh-CN': '已发布 Bot DTE · 隔离诊断（标准框架）', 'zh-TW': '已發佈 Bot DTE · 隔離診斷（標準框架）', ja: '公開 Bot DTE · 分離診断（標準ハーネス）', ko: '게시 봇 DTE · 격리 진단(표준 하네스)' },
    'Published-bot DTE · island sidecar diagnostic (Entra · non-GHCP)': { 'zh-CN': '已发布 Bot DTE · island 边车诊断（Entra · 非 GHCP）', 'zh-TW': '已發佈 Bot DTE · island sidecar 診斷（Entra · 非 GHCP）', ja: '公開 Bot DTE · island サイドカー診断（Entra · GHCP 以外）', ko: '게시 봇 DTE · island 사이드카 진단(Entra · 비 GHCP)' },
    'Generated hosts currently support commercial': { 'zh-CN': '当前生成的主机仅支持商业', 'zh-TW': '目前產生的主機僅支援商業', ja: '生成ホストが現在対応するのは商用', ko: '현재 생성 호스트는 상용' },
    'environments only.': { 'zh-CN': '环境。', 'zh-TW': '環境。', ja: '環境のみです。', ko: '환경만 지원합니다.' },
    'Experimental diagnostic for a': { 'zh-CN': '用于', 'zh-TW': '用於', ja: '対象:', ko: '대상:' },
    'no-auth Copilot Studio agent': { 'zh-CN': '无身份验证的 Copilot Studio 智能体的实验性诊断', 'zh-TW': '無驗證 Copilot Studio 代理程式的實驗性診斷', ja: '認証なし Copilot Studio エージェントの試験的診断', ko: '인증 없는 Copilot Studio 에이전트의 실험적 진단' },
    '. It mints a Direct Line token from the': { 'zh-CN': '。它从', 'zh-TW': '。它從', ja: '。次から Direct Line トークンを発行します:', ko: '. 다음에서 Direct Line 토큰을 발급합니다:' },
    'endpoint, opens a Direct Line 3.0 WebSocket on the regional host, and sends the empirical': { 'zh-CN': '终结点铸造 Direct Line 令牌，在区域主机上打开 Direct Line 3.0 WebSocket，并发送实测的', 'zh-TW': '端點鑄造 Direct Line 權杖，在區域主機上開啟 Direct Line 3.0 WebSocket，並傳送實測的', ja: 'エンドポイントを使い、リージョン ホストで Direct Line 3.0 WebSocket を開き、実測した', ko: '엔드포인트를 사용하고 지역 호스트에서 Direct Line 3.0 WebSocket을 연 뒤 실측된' },
    'opt-in. The channel is stream-capable, but the agent runtime may still return one final message; our tested no-auth new agent did exactly that.': { 'zh-CN': 'opt-in。该通道具备流式传输能力，但智能体运行时仍可能只返回一个最终消息；我们测试的无身份验证新智能体就是如此。', 'zh-TW': 'opt-in。此通道具備串流能力，但代理程式執行階段仍可能只傳回一個最終訊息；我們測試的無驗證新代理程式正是如此。', ja: 'opt-in を送ります。チャネルはストリーム対応ですが、エージェント ランタイムが final メッセージを 1 件だけ返す場合があります。検証した認証なしの新しいエージェントがまさにそうでした。', ko: 'opt-in을 보냅니다. 채널은 스트림을 지원하지만 에이전트 런타임이 최종 메시지 하나만 반환할 수 있습니다. 테스트한 인증 없는 새 에이전트가 정확히 그랬습니다.' },
    'Not for a GHCP harness agent.': { 'zh-CN': '不适用于 GHCP 框架智能体。', 'zh-TW': '不適用於 GHCP 框架代理程式。', ja: 'GHCP ハーネス エージェントには使用しません。', ko: 'GHCP 하네스 에이전트용이 아닙니다.' },
    'Current GHCP documentation lists Web app iframe support but no Native app / Direct Line channel. For a Microsoft-authenticated GHCP agent, use the separate experimental': { 'zh-CN': '当前 GHCP 文档列出 Web app iframe 支持，但没有 Native app / Direct Line 通道。对于 Microsoft 身份验证的 GHCP 智能体，请使用单独的实验性', 'zh-TW': '目前 GHCP 文件列出 Web app iframe 支援，但沒有 Native app / Direct Line 通道。對於 Microsoft 驗證的 GHCP 代理程式，請使用獨立的實驗性', ja: '現在の GHCP ドキュメントでは Web app iframe はサポートされていますが、Native app / Direct Line チャネルはありません。Microsoft 認証 GHCP エージェントでは、別の試験的な', ko: '현재 GHCP 문서는 Web app iframe을 지원하지만 Native app / Direct Line 채널은 제공하지 않습니다. Microsoft 인증 GHCP 에이전트에는 별도의 실험적' },
    'GHCP harness · /3p': { 'zh-CN': 'GHCP 框架 · /3p', 'zh-TW': 'GHCP 框架 · /3p', ja: 'GHCP ハーネス · /3p', ko: 'GHCP 하네스 · /3p' },
    'mode.': { 'zh-CN': '模式。', 'zh-TW': '模式。', ja: 'モードを使用します。', ko: '모드를 사용하세요.' },
    'Entra application (client) ID': { 'zh-CN': 'Entra 应用程序（客户端）ID', 'zh-TW': 'Entra 應用程式（用戶端）ID', ja: 'Entra アプリケーション（クライアント）ID', ko: 'Entra 애플리케이션(클라이언트) ID' },
    'SPA app registration with the': { 'zh-CN': '具有', 'zh-TW': '具備', ja: 'SPA アプリ登録に', ko: 'SPA 앱 등록에' },
    'delegated permission.': { 'zh-CN': '委托权限的 SPA 应用注册。', 'zh-TW': '委派權限的 SPA 應用程式註冊。', ja: '委任アクセス許可を付与します。', ko: '위임 권한을 부여합니다.' },
    'Directory (tenant) ID': { 'zh-CN': '目录（租户）ID', 'zh-TW': '目錄（租用戶）ID', ja: 'ディレクトリ（テナント）ID', ko: '디렉터리(테넌트) ID' },
    'Environment ID': { 'zh-CN': '环境 ID', 'zh-TW': '環境 ID', ja: '環境 ID', ko: '환경 ID' },
    'Agent schema name': { 'zh-CN': '智能体架构名称', 'zh-TW': '代理程式結構描述名稱', ja: 'エージェント スキーマ名', ko: '에이전트 스키마 이름' },
    'You sign in with your own Entra account; no secret leaves the browser. This is the only mode that surfaces token-by-token generative streaming.': {
      'zh-CN': '使用你自己的 Entra 帐户登录；没有密钥离开浏览器。这是呈现逐 token 生成式流式响应的模式。',
      'zh-TW': '使用你自己的 Entra 帳戶登入；不會有密鑰離開瀏覽器。這是呈現逐 token 生成式串流的模式。',
      ja: '自分の Entra アカウントでサインインします。シークレットはブラウザー外に出ません。token 単位の生成ストリーミングを表示するモードです。',
      ko: '본인의 Entra 계정으로 로그인합니다. 비밀은 브라우저를 벗어나지 않습니다. 토큰 단위 생성형 스트리밍을 표시하는 모드입니다.'
    },
    'Token endpoint URL': { 'zh-CN': '令牌终结点 URL', 'zh-TW': '權杖端點 URL', ja: 'トークン エンドポイント URL', ko: '토큰 엔드포인트 URL' },
    'Copilot Studio → Settings → Channels → "Custom website" / Mobile app → Token endpoint.': {
      'zh-CN': 'Copilot Studio → 设置 → 渠道 →“自定义网站”/ 移动应用 → 令牌终结点。',
      'zh-TW': 'Copilot Studio → 設定 → 管道 →「自訂網站」/ 行動應用程式 → 權杖端點。',
      ja: 'Copilot Studio → 設定 → チャネル →「カスタム Web サイト」/ モバイル アプリ → トークン エンドポイント。',
      ko: 'Copilot Studio → 설정 → 채널 → “사용자 지정 웹 사이트” / 모바일 앱 → 토큰 엔드포인트.'
    },
    'Direct Line secret or token': { 'zh-CN': 'Direct Line 密钥或令牌', 'zh-TW': 'Direct Line 密鑰或權杖', ja: 'Direct Line シークレットまたはトークン', ko: 'Direct Line 비밀 또는 토큰' },
    'Use a token where possible. Secrets in the browser are for local testing only.': {
      'zh-CN': '尽可能使用令牌。浏览器中的密钥仅用于本地测试。',
      'zh-TW': '請盡可能使用權杖。瀏覽器中的密鑰僅供本機測試。',
      ja: '可能な場合はトークンを使用してください。ブラウザー内のシークレットはローカル テスト専用です。',
      ko: '가능하면 토큰을 사용하세요. 브라우저의 비밀은 로컬 테스트 전용입니다.'
    },
    'Direct Line secret, token, or token-endpoint URL': { 'zh-CN': 'Direct Line 密钥、令牌或令牌终结点 URL', 'zh-TW': 'Direct Line 密鑰、權杖或權杖端點 URL', ja: 'Direct Line シークレット、トークン、またはトークン エンドポイント URL', ko: 'Direct Line 비밀, 토큰 또는 토큰 엔드포인트 URL' },
    'Experimental: connects over Direct Line (WebSocket) and coalesces Copilot Studio': {
      'zh-CN': '实验性：通过 Direct Line (WebSocket) 连接，并合并 Copilot Studio',
      'zh-TW': '實驗性：透過 Direct Line (WebSocket) 連線，並合併 Copilot Studio',
      ja: '試験的: Direct Line (WebSocket) で接続し、Copilot Studio の',
      ko: '실험적: Direct Line(WebSocket)으로 연결하고 Copilot Studio'
    },
    'chunks into one growing bubble by': { 'zh-CN': '分块，按', 'zh-TW': '區塊，依', ja: 'チャンクを', ko: '청크를' },
    ', dropping the trailing duplicate final message. Accepts a secret, a Direct Line token, or a token-endpoint URL — whichever “connection string” you have for the agent.': {
      'zh-CN': '合并到一个不断增长的气泡，并丢弃尾随的重复最终消息。可接受密钥、Direct Line 令牌或令牌终结点 URL，也就是你手头的智能体“连接字符串”。',
      'zh-TW': '合併成一個持續增長的泡泡，並丟棄尾端重複的最終訊息。可接受密鑰、Direct Line 權杖或權杖端點 URL，也就是你手邊的代理程式「連線字串」。',
      ja: 'に基づいて 1 つの成長するバブルに集約し、末尾の重複 final メッセージを破棄します。エージェント用の「接続文字列」として、シークレット、Direct Line トークン、トークン エンドポイント URL を受け付けます。',
      ko: '기준으로 하나의 커지는 버블로 병합하고 마지막 중복 final 메시지를 버립니다. 에이전트에 사용할 수 있는 “연결 문자열”로 비밀, Direct Line 토큰 또는 토큰 엔드포인트 URL을 허용합니다.'
    },
    'Force Web Socket transport': { 'zh-CN': '强制使用 WebSocket 传输', 'zh-TW': '強制使用 WebSocket 傳輸', ja: 'WebSocket トランスポートを強制', ko: 'WebSocket 전송 강제' },
    '(Direct Line modes only)': { 'zh-CN': '（仅 Direct Line 模式）', 'zh-TW': '（僅 Direct Line 模式）', ja: '（Direct Line モードのみ）', ko: '(Direct Line 모드만)' },
    'Capture streaming chunks in inspector': { 'zh-CN': '在检查器中捕获流式分块', 'zh-TW': '在檢查器中擷取串流區塊', ja: 'インスペクターでストリーミング チャンクをキャプチャ', ko: '검사기에서 스트리밍 청크 캡처' },
    'Typewriter effect': { 'zh-CN': '打字机效果', 'zh-TW': '打字機效果', ja: 'タイプライター効果', ko: '타자기 효과' },
    '(Direct Line final messages)': { 'zh-CN': '（Direct Line 最终消息）', 'zh-TW': '（Direct Line 最終訊息）', ja: '（Direct Line の final メッセージ）', ko: '(Direct Line 최종 메시지)' },
    'Connect': { 'zh-CN': '连接', 'zh-TW': '連線', ja: '接続', ko: '연결' },
    'Test connection': { 'zh-CN': '测试连接', 'zh-TW': '測試連線', ja: '接続テスト', ko: '연결 테스트' },
    'Disconnect': { 'zh-CN': '断开连接', 'zh-TW': '中斷連線', ja: '切断', ko: '연결 끊기' },
    'Streaming legend': { 'zh-CN': '流式响应图例', 'zh-TW': '串流圖例', ja: 'ストリーミング凡例', ko: '스트리밍 범례' },
    'latency loader (e.g. "Searching…")': { 'zh-CN': '延迟加载提示（例如“正在搜索…”）', 'zh-TW': '延遲載入提示（例如「正在搜尋…」）', ja: '待機中表示（例:「検索中…」）', ko: '지연 로더(예: “검색 중…”)' },
    'interim chunk (typing activity)': { 'zh-CN': '中间分块（typing 活动）', 'zh-TW': '中繼區塊（typing 活動）', ja: '途中チャンク（typing アクティビティ）', ko: '중간 청크(typing 활동)' },
    'concluded message': { 'zh-CN': '已完成消息', 'zh-TW': '已完成訊息', ja: '完了メッセージ', ko: '완료 메시지' },
    'Canvas': { 'zh-CN': '画布', 'zh-TW': '畫布', ja: 'キャンバス', ko: '캔버스' },
    'conversation: —': { 'zh-CN': '对话：—', 'zh-TW': '交談：—', ja: '会話: —', ko: '대화: —' },
    'conversation: {id}': { 'zh-CN': '对话：{id}', 'zh-TW': '交談：{id}', ja: '会話: {id}', ko: '대화: {id}' },
    'Connect to your Copilot Studio agent to start streaming.': {
      'zh-CN': '连接到你的 Copilot Studio 智能体以开始流式响应。',
      'zh-TW': '連線到你的 Copilot Studio 代理程式以開始串流。',
      ja: 'Copilot Studio エージェントに接続してストリーミングを開始します。',
      ko: 'Copilot Studio 에이전트에 연결하여 스트리밍을 시작하세요.'
    },
    'Activity inspector': { 'zh-CN': '活动检查器', 'zh-TW': '活動檢查器', ja: 'アクティビティ インスペクター', ko: '활동 검사기' },
    'Clear': { 'zh-CN': '清除', 'zh-TW': '清除', ja: 'クリア', ko: '지우기' },
    'livestreams': { 'zh-CN': '流会话', 'zh-TW': '串流工作階段', ja: 'ライブストリーム', ko: '라이브스트림' },
    'chunks': { 'zh-CN': '分块', 'zh-TW': '區塊', ja: 'チャンク', ko: '청크' },
    'finalized': { 'zh-CN': '已最终完成', 'zh-TW': '已完成', ja: '確定済み', ko: '완료됨' },
    'Waiting for bot activity…': { 'zh-CN': '正在等待机器人活动…', 'zh-TW': '正在等待 Bot 活動…', ja: 'ボット アクティビティを待機中…', ko: '봇 활동을 기다리는 중…' },
    'Initializing…': { 'zh-CN': '正在初始化…', 'zh-TW': '正在初始化…', ja: '初期化中…', ko: '초기화 중…' },
    'Connecting…': { 'zh-CN': '正在连接…', 'zh-TW': '正在連線…', ja: '接続中…', ko: '연결 중…' },
    'Online · streaming ready': { 'zh-CN': '在线 · 已可流式响应', 'zh-TW': '線上 · 已可串流', ja: 'オンライン · ストリーミング準備完了', ko: '온라인 · 스트리밍 준비됨' },
    'Online · Direct Line connected': { 'zh-CN': '在线 · Direct Line 已连接', 'zh-TW': '線上 · Direct Line 已連線', ja: 'オンライン · Direct Line 接続済み', ko: '온라인 · Direct Line 연결됨' },
    'Token expired': { 'zh-CN': '令牌已过期', 'zh-TW': '權杖已過期', ja: 'トークンの有効期限切れ', ko: '토큰 만료됨' },
    'Failed to connect': { 'zh-CN': '连接失败', 'zh-TW': '連線失敗', ja: '接続に失敗しました', ko: '연결 실패' },
    'Conversation ended': { 'zh-CN': '对话已结束', 'zh-TW': '交談已結束', ja: '会話が終了しました', ko: '대화 종료됨' },
    'Acquiring token…': { 'zh-CN': '正在获取令牌…', 'zh-TW': '正在取得權杖…', ja: 'トークンを取得中…', ko: '토큰을 가져오는 중…' },
    'Acquiring Direct Line token…': { 'zh-CN': '正在获取 Direct Line 令牌…', 'zh-TW': '正在取得 Direct Line 權杖…', ja: 'Direct Line トークンを取得中…', ko: 'Direct Line 토큰을 가져오는 중…' },
    'Signing in with Entra ID…': { 'zh-CN': '正在使用 Entra ID 登录…', 'zh-TW': '正在使用 Entra ID 登入…', ja: 'Entra ID でサインイン中…', ko: 'Entra ID로 로그인 중…' },
    'Redirecting to Microsoft sign-in…': { 'zh-CN': '正在重定向到 Microsoft 登录…', 'zh-TW': '正在重新導向到 Microsoft 登入…', ja: 'Microsoft サインインにリダイレクト中…', ko: 'Microsoft 로그인으로 리디렉션 중…' },
    'Connection failed': { 'zh-CN': '连接失败', 'zh-TW': '連線失敗', ja: '接続に失敗しました', ko: '연결 실패' },
    'Connected. Send a message to see streaming chunks arrive.': {
      'zh-CN': '已连接。发送消息以查看流式分块到达。',
      'zh-TW': '已連線。傳送訊息以查看串流區塊抵達。',
      ja: '接続しました。メッセージを送るとストリーミング チャンクが届きます。',
      ko: '연결되었습니다. 메시지를 보내 스트리밍 청크가 도착하는지 확인하세요.'
    },
    'Connected to no-auth Agentic Direct Line. The runtime may return final-only.': {
      'zh-CN': '已连接到无身份验证的 Agentic Direct Line。运行时可能仅返回最终消息。',
      'zh-TW': '已連線到無驗證的 Agentic Direct Line。執行階段可能僅傳回最終訊息。',
      ja: '認証なし Agentic Direct Line に接続しました。ランタイムは final のみを返す場合があります。',
      ko: '인증 없는 Agentic Direct Line에 연결되었습니다. 런타임이 최종 메시지만 반환할 수 있습니다.'
    },
    'Streaming opt-in sent (deliveryMode:"stream") — send a message to see chunks.': {
      'zh-CN': '已发送流式响应 opt-in（deliveryMode:"stream"）— 发送消息查看分块。',
      'zh-TW': '已傳送串流 opt-in（deliveryMode:"stream"）— 傳送訊息查看區塊。',
      ja: 'ストリーミング opt-in（deliveryMode:"stream"）を送信しました — メッセージを送るとチャンクを確認できます。',
      ko: '스트리밍 opt-in(deliveryMode:"stream")을 보냈습니다 — 메시지를 보내 청크를 확인하세요.'
    },
    'Livestream opt-in sent; the runtime still decides whether chunks are emitted.': {
      'zh-CN': '已发送实时流式 opt-in；是否发出分块仍由运行时决定。',
      'zh-TW': '已傳送即時串流 opt-in；是否發出區塊仍由執行階段決定。',
      ja: 'ライブストリーム opt-in を送信しました。チャンクを出すかどうかはランタイムが決定します。',
      ko: '라이브스트림 opt-in을 보냈습니다. 청크 방출 여부는 런타임이 결정합니다.'
    },
    'Copilot Studio SDK ready · Direct-to-Engine. Click Connect to sign in and stream.': {
      'zh-CN': 'Copilot Studio SDK 已就绪 · Direct-to-Engine。点击“连接”登录并开始流式响应。',
      'zh-TW': 'Copilot Studio SDK 已就緒 · Direct-to-Engine。按一下「連線」登入並開始串流。',
      ja: 'Copilot Studio SDK 準備完了 · Direct-to-Engine。「接続」をクリックしてサインインし、ストリーミングします。',
      ko: 'Copilot Studio SDK 준비됨 · Direct-to-Engine. 연결을 클릭해 로그인하고 스트리밍하세요.'
    },
    'Direct Line secret loaded from .env · Direct Line secret / token mode. Click Connect.': {
      'zh-CN': '已从 .env 加载 Direct Line 密钥 · Direct Line 密钥 / 令牌模式。点击“连接”。',
      'zh-TW': '已從 .env 載入 Direct Line 密鑰 · Direct Line 密鑰 / 權杖模式。按一下「連線」。',
      ja: '.env から Direct Line シークレットを読み込みました · Direct Line シークレット / トークン モード。「接続」をクリックします。',
      ko: '.env에서 Direct Line 비밀을 로드했습니다 · Direct Line 비밀 / 토큰 모드. 연결을 클릭하세요.'
    },
    'Fill in the Entra client ID and Environment ID below (or add them to .env), then Connect. SDK mode is the only one that streams generatively.': {
      'zh-CN': '填写下面的 Entra 客户端 ID 和环境 ID（或将其添加到 .env），然后连接。SDK 模式是生成式流式响应的模式。',
      'zh-TW': '填入下方的 Entra 用戶端 ID 和環境 ID（或新增到 .env），然後連線。SDK 模式是生成式串流的模式。',
      ja: '下の Entra クライアント ID と環境 ID を入力（または .env に追加）してから接続します。SDK モードは生成ストリーミングを表示するモードです。',
      ko: '아래 Entra 클라이언트 ID와 환경 ID를 입력하거나 .env에 추가한 뒤 연결하세요. SDK 모드는 생성형 스트리밍을 표시하는 모드입니다.'
    },
    'Server relay ready · mode: {mode}{host}. For generative streaming, switch to SDK mode.': {
      'zh-CN': '服务器中继已就绪 · 模式：{mode}{host}。若要生成式流式响应，请切换到 SDK 模式。',
      'zh-TW': '伺服器轉送已就緒 · 模式：{mode}{host}。若要生成式串流，請切換到 SDK 模式。',
      ja: 'サーバー リレー準備完了 · モード: {mode}{host}。生成ストリーミングには SDK モードへ切り替えます。',
      ko: '서버 릴레이 준비됨 · 모드: {mode}{host}. 생성형 스트리밍을 보려면 SDK 모드로 전환하세요.'
    },
    'Could not reach the server. Using client-side SDK mode.': {
      'zh-CN': '无法访问服务器。正在使用客户端 SDK 模式。',
      'zh-TW': '無法連線到伺服器。正在使用用戶端 SDK 模式。',
      ja: 'サーバーに到達できませんでした。クライアント側 SDK モードを使用します。',
      ko: '서버에 연결할 수 없습니다. 클라이언트 쪽 SDK 모드를 사용합니다.'
    },
    'Sign-in failed': { 'zh-CN': '登录失败', 'zh-TW': '登入失敗', ja: 'サインイン失敗', ko: '로그인 실패' },
    '✗ Sign-in failed: {message}': { 'zh-CN': '✗ 登录失败：{message}', 'zh-TW': '✗ 登入失敗：{message}', ja: '✗ サインイン失敗: {message}', ko: '✗ 로그인 실패: {message}' },
    'Streaming ✓ — {chunks} chunk(s) across {streams} livestream(s)': {
      'zh-CN': '正在流式响应 ✓ — {streams} 个流会话中 {chunks} 个分块',
      'zh-TW': '正在串流 ✓ — {streams} 個串流工作階段中 {chunks} 個區塊',
      ja: 'ストリーミング中 ✓ — {streams} 件のライブストリームで {chunks} チャンク',
      ko: '스트리밍 중 ✓ — {streams}개 라이브스트림, {chunks}개 청크'
    },
    'Progressive answer ✓ — {chunks} streaming chunk(s) across {streams} livestream(s)': {
      'zh-CN': '渐进式回答 ✓ — {streams} 个实时流中有 {chunks} 个流式分块',
      'zh-TW': '漸進式回答 ✓ — {streams} 個即時串流中有 {chunks} 個串流區塊',
      ja: '段階的な回答 ✓ — {streams} 件のライブストリームで {chunks} ストリーミング チャンク',
      ko: '점진적 답변 ✓ — {streams}개 라이브스트림에서 {chunks}개 스트리밍 청크'
    },
    'Livestream protocol observed — progressive answer text not proven ({informative} informative, {chunks} streaming)': {
      'zh-CN': '已观察到实时流式协议 — 尚未证明回答文本为渐进式（{informative} 个 informative，{chunks} 个 streaming）',
      'zh-TW': '已觀察到即時串流通訊協定 — 尚未證明回答文字為漸進式（{informative} 個 informative，{chunks} 個 streaming）',
      ja: 'ライブストリーム プロトコルを観測 — 段階的な回答テキストは未確認（informative {informative}、streaming {chunks}）',
      ko: '라이브스트림 프로토콜 관측 — 점진적 답변 텍스트는 확인되지 않음(informative {informative}, streaming {chunks})'
    },
    'Final-only response — no livestream metadata emitted': {
      'zh-CN': '仅最终响应 — 未发出实时流式元数据',
      'zh-TW': '僅最終回應 — 未發出即時串流中繼資料',
      ja: 'final のみの応答 — ライブストリーム メタデータなし',
      ko: '최종 응답만 있음 — 라이브스트림 메타데이터 없음'
    },
    'Not streaming — only typing + final message (generative streaming not emitted)': {
      'zh-CN': '未流式响应 — 只有 typing + final 消息（未发出生成式流式响应）',
      'zh-TW': '未串流 — 只有 typing + final 訊息（未發出生成式串流）',
      ja: 'ストリーミングなし — typing + final メッセージのみ（生成ストリーミング未送信）',
      ko: '스트리밍 아님 — typing + final 메시지만 있음(생성형 스트리밍 미발행)'
    },
    'Thought process': { 'zh-CN': '思考过程', 'zh-TW': '思考過程', ja: '思考プロセス', ko: '사고 과정' },
    'Raw activity JSON': { 'zh-CN': '原始活动 JSON', 'zh-TW': '原始活動 JSON', ja: '生のアクティビティ JSON', ko: '원시 활동 JSON' },
    'stream: {id} · len {length}{suffix}': { 'zh-CN': '流：{id} · 长度 {length}{suffix}', 'zh-TW': '串流：{id} · 長度 {length}{suffix}', ja: 'ストリーム: {id} · 長さ {length}{suffix}', ko: '스트림: {id} · 길이 {length}{suffix}' },
    ' · invalid per schema': { 'zh-CN': ' · 不符合架构', 'zh-TW': ' · 不符合結構描述', ja: ' · スキーマ上無効', ko: ' · 스키마 기준 유효하지 않음' },
      ' · stale or out of order': { 'zh-CN': ' · 已过时或乱序', 'zh-TW': ' · 已過時或順序錯誤', ja: ' · 古いか順序違反', ko: ' · 오래되었거나 순서가 잘못됨' },
    'Checking existing Entra session…': { 'zh-CN': '正在检查现有 Entra 会话…', 'zh-TW': '正在檢查現有 Entra 工作階段…', ja: '既存の Entra セッションを確認中…', ko: '기존 Entra 세션 확인 중…' },
    'Testing token acquisition…': { 'zh-CN': '正在测试令牌获取…', 'zh-TW': '正在測試權杖取得…', ja: 'トークン取得をテスト中…', ko: '토큰 획득 테스트 중…' },
    'Testing server connection…': { 'zh-CN': '正在测试服务器连接…', 'zh-TW': '正在測試伺服器連線…', ja: 'サーバー接続をテスト中…', ko: '서버 연결 테스트 중…' },
    '✓ Token acquired ({chars} chars). Click Connect to chat.': { 'zh-CN': '✓ 已获取令牌（{chars} 个字符）。点击“连接”开始聊天。', 'zh-TW': '✓ 已取得權杖（{chars} 個字元）。按一下「連線」開始聊天。', ja: '✓ トークンを取得しました（{chars} 文字）。「接続」をクリックしてチャットします。', ko: '✓ 토큰을 획득했습니다({chars}자). 연결을 클릭해 채팅하세요.' },
    '✓ Signed in · token acquired ({chars} chars). Click Connect to chat.': { 'zh-CN': '✓ 已登录 · 已获取令牌（{chars} 个字符）。点击“连接”开始聊天。', 'zh-TW': '✓ 已登入 · 已取得權杖（{chars} 個字元）。按一下「連線」開始聊天。', ja: '✓ サインイン済み · トークンを取得しました（{chars} 文字）。「接続」をクリックしてチャットします。', ko: '✓ 로그인됨 · 토큰을 획득했습니다({chars}자). 연결을 클릭해 채팅하세요.' },
    '✓ Connected via {source}. Conversation {conversationId} · streamUrl {streamUrlStatus} · {elapsedMs}ms': { 'zh-CN': '✓ 已通过 {source} 连接。对话 {conversationId} · streamUrl {streamUrlStatus} · {elapsedMs}ms', 'zh-TW': '✓ 已透過 {source} 連線。交談 {conversationId} · streamUrl {streamUrlStatus} · {elapsedMs}ms', ja: '✓ {source} 経由で接続しました。会話 {conversationId} · streamUrl {streamUrlStatus} · {elapsedMs}ms', ko: '✓ {source}을(를) 통해 연결됨. 대화 {conversationId} · streamUrl {streamUrlStatus} · {elapsedMs}ms' },
    'present': { 'zh-CN': '存在', 'zh-TW': '存在', ja: 'あり', ko: '있음' },
    'missing': { 'zh-CN': '缺失', 'zh-TW': '遺失', ja: 'なし', ko: '없음' },
    '✗ {message}': { 'zh-CN': '✗ {message}', 'zh-TW': '✗ {message}', ja: '✗ {message}', ko: '✗ {message}' },

    // Deck static UI and content
    'Streaming Responses in Copilot Studio — Tech Note Deck': {
      'zh-CN': 'Copilot Studio 流式响应 — 技术说明演示文稿',
      'zh-TW': 'Copilot Studio 串流回應 — 技術說明簡報',
      ja: 'Copilot Studio のストリーミング応答 — 技術ノート デッキ',
      ko: 'Copilot Studio 스트리밍 응답 — 기술 노트 데크'
    },
    'Streaming Responses in Copilot Studio': {
      'zh-CN': 'Copilot Studio 中的流式响应',
      'zh-TW': 'Copilot Studio 中的串流回應',
      ja: 'Copilot Studio のストリーミング応答',
      ko: 'Copilot Studio의 스트리밍 응답'
    },
    'TECH NOTE · KNOWLEDGE SHARING': { 'zh-CN': '技术说明 · 知识共享', 'zh-TW': '技術說明 · 知識分享', ja: '技術ノート · ナレッジ共有', ko: '기술 노트 · 지식 공유' },
    'Streaming Responses in': { 'zh-CN': 'Copilot Studio 中的', 'zh-TW': 'Copilot Studio 中的', ja: 'Copilot Studio の', ko: 'Copilot Studio의' },
    'What works, what doesn\'t, and the gotchas we hit building a live token-by-token streaming chat playground — across': {
      'zh-CN': '构建逐 token 实时流式聊天体验场时的可行方案、不可行点和踩坑记录 — 覆盖',
      'zh-TW': '建置逐 token 即時串流聊天體驗場時的可行方案、不可行點與踩坑紀錄 — 涵蓋',
      ja: 'token 単位のライブ ストリーミング チャット プレイグラウンドを構築して分かったこと、動かないこと、落とし穴 — 対象は',
      ko: '토큰 단위 실시간 스트리밍 채팅 플레이그라운드를 만들며 확인한 동작, 비동작, 주의점 — 대상은'
    },
    'What works, what doesn\'t, and the gotchas we hit building a live progressive-response chat playground — across': {
      'zh-CN': '构建实时渐进式响应聊天体验场时的可行方案、不可行点和踩坑记录 — 覆盖',
      'zh-TW': '建置即時漸進式回應聊天體驗場時的可行方案、不可行點與踩坑紀錄 — 涵蓋',
      ja: 'ライブで段階的に応答するチャット プレイグラウンドを構築して分かったこと、動かないこと、落とし穴 — 対象は',
      ko: '실시간 점진적 응답 채팅 플레이그라운드를 만들며 확인한 동작, 비동작, 주의점 — 대상은'
    },
    'both': { 'zh-CN': '两种', 'zh-TW': '兩種', ja: '両方の', ko: '두 가지' },
    'Direct Line and the Direct-to-Engine SDK.': { 'zh-CN': 'Direct Line 和 Direct-to-Engine SDK。', 'zh-TW': 'Direct Line 和 Direct-to-Engine SDK。', ja: 'Direct Line と Direct-to-Engine SDK です。', ko: 'Direct Line 및 Direct-to-Engine SDK입니다.' },
    'Surface': { 'zh-CN': '界面', 'zh-TW': '介面', ja: 'サーフェス', ko: '화면' },
    'Copilot Studio agent + Bot Framework Web Chat': { 'zh-CN': 'Copilot Studio 智能体 + Bot Framework Web Chat', 'zh-TW': 'Copilot Studio 代理程式 + Bot Framework Web Chat', ja: 'Copilot Studio エージェント + Bot Framework Web Chat', ko: 'Copilot Studio 에이전트 + Bot Framework Web Chat' },
    'Transports': { 'zh-CN': '传输', 'zh-TW': '傳輸', ja: 'トランスポート', ko: '전송' },
    'Date': { 'zh-CN': '日期', 'zh-TW': '日期', ja: '日付', ko: '날짜' },
    'June 2026': { 'zh-CN': '2026 年 6 月', 'zh-TW': '2026 年 6 月', ja: '2026 年 6 月', ko: '2026년 6월' },
    'Why It Matters': { 'zh-CN': '为何重要', 'zh-TW': '為何重要', ja: 'なぜ重要か', ko: '왜 중요한가' },
    'The business case for live streaming responses': { 'zh-CN': '实时流式响应的业务价值', 'zh-TW': '即時串流回應的商業價值', ja: 'ライブ ストリーミング応答のビジネス価値', ko: '실시간 스트리밍 응답의 비즈니스 가치' },
    '😊 Higher customer satisfaction': { 'zh-CN': '😊 更高的客户满意度', 'zh-TW': '😊 更高的客戶滿意度', ja: '😊 顧客満足度の向上', ko: '😊 더 높은 고객 만족도' },
    'Answers appear immediately and grow token-by-token, so the wait feels far shorter even when the total time is unchanged. Users stay engaged instead of staring at a spinner.': {
      'zh-CN': '回答立即出现并逐 token 增长，即使总耗时不变，等待也感觉短得多。用户保持投入，而不是盯着加载圈。',
      'zh-TW': '回答立即出現並逐 token 增長，即使總耗時不變，等待也感覺短得多。使用者保持投入，而不是盯著載入圈。',
      ja: '回答が即座に表示され token 単位で増えていくため、総時間が同じでも待ち時間がはるかに短く感じられます。ユーザーはスピナーを眺める代わりに関心を保ちます。',
      ko: '답변이 즉시 나타나 토큰 단위로 커지므로 전체 시간이 같아도 대기가 훨씬 짧게 느껴집니다. 사용자는 스피너를 바라보는 대신 집중을 유지합니다.'
    },
    'Answers appear immediately and grow progressively, so the wait feels far shorter even when the total time is unchanged. Users stay engaged instead of staring at a spinner.': {
      'zh-CN': '回答立即出现并逐步增长，即使总耗时不变，等待也感觉短得多。用户保持投入，而不是盯着加载圈。',
      'zh-TW': '回答立即出現並逐步增長，即使總耗時不變，等待也感覺短得多。使用者保持投入，而不是盯著載入圈。',
      ja: '回答がすぐに表示され段階的に増えるため、総時間が同じでも待ち時間が短く感じられます。ユーザーはスピナーを眺めず関心を保てます。',
      ko: '답변이 즉시 나타나 점진적으로 커지므로 전체 시간이 같아도 대기가 훨씬 짧게 느껴집니다. 사용자는 스피너를 바라보는 대신 집중을 유지합니다.'
    },
    '🔍 Transparency builds trust': { 'zh-CN': '🔍 透明度建立信任', 'zh-TW': '🔍 透明度建立信任', ja: '🔍 透明性が信頼を生む', ko: '🔍 투명성이 신뢰를 만든다' },
    'The inline thought process reveals what the agent is doing behind the scenes — searching, planning, analyzing — so the interaction feels meaningful and the answer feels earned, not guessed.': {
      'zh-CN': '内联的思考过程展示了智能体在幕后所做的事 — 搜索、规划、分析 — 让交互更有意义，答案也显得有据可循，而非凭空猜测。',
      'zh-TW': '內嵌的思考過程展示了代理程式在幕後所做的事 — 搜尋、規劃、分析 — 讓互動更有意義，答案也顯得有憑有據，而非憑空猜測。',
      ja: 'インラインの思考プロセスが、エージェントが裏側で行っていること（検索・計画・分析）を明らかにします。これにより対話が意味あるものになり、回答は当て推量ではなく根拠あるものに感じられます。',
      ko: '인라인 사고 과정은 에이전트가 보이지 않는 곳에서 하는 일(검색, 계획, 분석)을 드러내어 상호작용이 의미 있게 느껴지고 답변이 추측이 아니라 근거 있는 것으로 느껴집니다.'
    },
    '📉 Fewer abandoned conversations': { 'zh-CN': '📉 更少的中途放弃', 'zh-TW': '📉 更少的中途放棄', ja: '📉 途中離脱の減少', ko: '📉 대화 이탈 감소' },
    'Continuous, visible progress keeps people from giving up on longer answers. They see momentum, trust it is working, and wait for the full result.': {
      'zh-CN': '持续可见的进展让用户不会在较长回答中途放弃。他们看到进展、相信系统在运行，并等待完整结果。',
      'zh-TW': '持續可見的進展讓使用者不會在較長回答中途放棄。他們看到進展、相信系統正在運作，並等待完整結果。',
      ja: '継続的に見える進捗があることで、長い回答でもユーザーが途中であきらめません。動いていると感じて信頼し、最後の結果まで待ちます。',
      ko: '지속적으로 보이는 진행 상황 덕분에 사용자는 긴 답변에서도 도중에 포기하지 않습니다. 진행을 보고 동작 중임을 신뢰하며 완전한 결과를 기다립니다.'
    },
    '⭐ Meets modern expectations': { 'zh-CN': '⭐ 符合现代预期', 'zh-TW': '⭐ 符合現代期待', ja: '⭐ 最新の期待に応える', ko: '⭐ 최신 기대에 부응' },
    'Users now expect the ChatGPT / Copilot style of live reply. A static "pause, then dump a wall of text" response feels dated and lowers confidence in the agent.': {
      'zh-CN': '用户如今期待 ChatGPT / Copilot 那样的实时回复。先停顿、再一次性抛出大段文字的静态响应显得过时，并降低对智能体的信任。',
      'zh-TW': '使用者如今期待 ChatGPT / Copilot 那樣的即時回覆。先停頓、再一次拋出大段文字的靜態回應顯得過時，並降低對代理程式的信任。',
      ja: 'ユーザーは今や ChatGPT / Copilot のようなライブ応答を期待します。いったん止まってから大量のテキストを一度に出す静的な応答は時代遅れで、エージェントへの信頼を下げます。',
      ko: '이제 사용자는 ChatGPT / Copilot 스타일의 실시간 응답을 기대합니다. 멈췄다가 한꺼번에 긴 텍스트를 쏟아내는 정적 응답은 구식으로 느껴지고 에이전트에 대한 신뢰를 낮춥니다.'
    },
    'Streaming is not a UI gimmick — it is a measurable lever on satisfaction, trust, and completion, and the reason this playground was worth building.': {
      'zh-CN': '流式响应并非花哨的 UI 噱头 — 它是可衡量的杠杆，直接影响满意度、信任与完成率，也是这个实验场值得构建的原因。',
      'zh-TW': '串流回應並非花俏的 UI 噱頭 — 它是可衡量的槓桿，直接影響滿意度、信任與完成率，也是這個實驗場值得打造的原因。',
      ja: 'ストリーミングは UI の小細工ではありません — 満足度・信頼・完了率を左右する測定可能なレバーであり、このプレイグラウンドを作る価値があった理由です。',
      ko: '스트리밍은 UI 눈속임이 아닙니다 — 만족도, 신뢰, 완료율을 좌우하는 측정 가능한 지렛대이며, 이 플레이그라운드를 만들 가치가 있었던 이유입니다.'
    },
    'The Goal': { 'zh-CN': '目标', 'zh-TW': '目標', ja: '目標', ko: '목표' },
    'Render a real, progressive streaming answer': { 'zh-CN': '呈现真实、渐进式的流式回答', 'zh-TW': '呈現真實、漸進式的串流回答', ja: '本物の段階的なストリーミング回答を描画する', ko: '실제 점진적 스트리밍 답변 렌더링' },
    'We wanted the same experience users expect from modern AI chat:': { 'zh-CN': '我们想实现现代 AI 聊天中用户期待的体验：', 'zh-TW': '我們想實現現代 AI 聊天中使用者期待的體驗：', ja: '現代の AI チャットでユーザーが期待する体験を目指しました:', ko: '최신 AI 채팅에서 사용자가 기대하는 경험을 목표로 했습니다:' },
    'A': { 'zh-CN': '一个', 'zh-TW': '一個', ja: '1 つの', ko: '하나의' },
    'single answer bubble': { 'zh-CN': '单一回答气泡', 'zh-TW': '單一回答泡泡', ja: '単一の回答バブル', ko: '하나의 답변 버블' },
    'that grows token-by-token in place.': { 'zh-CN': '在原位逐 token 增长。', 'zh-TW': '在原位逐 token 增長。', ja: 'その場で token 単位に成長します。', ko: '제자리에서 토큰 단위로 커집니다.' },
    'that grows progressively in place.': { 'zh-CN': '在原位逐步增长。', 'zh-TW': '在原位逐步增長。', ja: 'その場で段階的に成長します。', ko: '제자리에서 점진적으로 커집니다.' },
    'An inline': { 'zh-CN': '内联', 'zh-TW': '內嵌', ja: 'インラインの', ko: '인라인' },
    '"thought process"': { 'zh-CN': '“思考过程”', 'zh-TW': '「思考過程」', ja: '「思考プロセス」', ko: '“사고 과정”' },
    'showing the agent\'s reasoning steps while it works.': { 'zh-CN': '在智能体工作时显示推理步骤。', 'zh-TW': '在代理程式工作時顯示推理步驟。', ja: 'エージェントの推論ステップを処理中に表示します。', ko: '에이전트가 작업하는 동안 추론 단계를 표시합니다.' },
    'The view': { 'zh-CN': '视图', 'zh-TW': '檢視', ja: 'ビューが', ko: '보기' },
    'auto-following': { 'zh-CN': '自动跟随', 'zh-TW': '自動跟隨', ja: '自動追従', ko: '자동으로 따라감' },
    'the answer as it streams.': { 'zh-CN': '正在流式输出的回答。', 'zh-TW': '正在串流輸出的回答。', ja: 'ストリーミング中の回答に追従します。', ko: '스트리밍되는 답변을 따라갑니다.' },
    'A diagnostics': { 'zh-CN': '一个诊断', 'zh-TW': '一個診斷', ja: '診断用の', ko: '진단' },
    'inspector': { 'zh-CN': '检查器', 'zh-TW': '檢查器', ja: 'インスペクター', ko: '검사기' },
    'to see raw streaming activities.': { 'zh-CN': '用于查看原始流式活动。', 'zh-TW': '用於查看原始串流活動。', ja: '生のストリーミング アクティビティを確認します。', ko: '원시 스트리밍 활동을 확인합니다.' },
    'The stack': { 'zh-CN': '技术栈', 'zh-TW': '技術堆疊', ja: 'スタック', ko: '스택' },
    'Web Chat:': { 'zh-CN': 'Web Chat：', 'zh-TW': 'Web Chat：', ja: 'Web Chat:', ko: 'Web Chat:' },
    'Client:': { 'zh-CN': '客户端：', 'zh-TW': '用戶端：', ja: 'クライアント:', ko: '클라이언트:' },
    '(Direct-to-Engine)': { 'zh-CN': '（Direct-to-Engine）', 'zh-TW': '（Direct-to-Engine）', ja: '（Direct-to-Engine）', ko: '(Direct-to-Engine)' },
    'Auth:': { 'zh-CN': '身份验证：', 'zh-TW': '驗證：', ja: '認証:', ko: '인증:' },
    '(Entra redirect)': { 'zh-CN': '（Entra 重定向）', 'zh-TW': '（Entra 重新導向）', ja: '（Entra リダイレクト）', ko: '(Entra 리디렉션)' },
    'Relay:': { 'zh-CN': '中继：', 'zh-TW': '轉送：', ja: 'リレー:', ko: '릴레이:' },
    'Express token server, port 3978': { 'zh-CN': 'Express 令牌服务器，端口 3978', 'zh-TW': 'Express 權杖伺服器，連接埠 3978', ja: 'Express トークン サーバー、ポート 3978', ko: 'Express 토큰 서버, 포트 3978' },
    'Streaming "just working" out of the box is a myth — Web Chat and the SDK each make assumptions you have to actively reconcile.': {
      'zh-CN': '“开箱即用”的流式响应是个误解 — Web Chat 和 SDK 各自有假设，需要主动调和。',
      'zh-TW': '串流「開箱即用」是個迷思 — Web Chat 和 SDK 各自有假設，需要主動調和。',
      ja: 'ストリーミングが「そのまま動く」は幻想です — Web Chat と SDK の前提を能動的に調整する必要があります。',
      ko: '스트리밍이 “그냥 동작한다”는 것은 착각입니다 — Web Chat과 SDK의 서로 다른 가정을 조정해야 합니다.'
    },
    'The Wire Format': { 'zh-CN': '线路格式', 'zh-TW': '線路格式', ja: 'ワイヤ形式', ko: '와이어 형식' },
    'How a streamed answer actually arrives': { 'zh-CN': '流式回答实际如何到达', 'zh-TW': '串流回答實際如何抵達', ja: 'ストリーミング回答が実際に届くしくみ', ko: '스트리밍 답변이 실제로 도착하는 방식' },
    'Dynamic reasoning steps ("Generating plan…", "Processing", "Analyzing data…").': { 'zh-CN': '动态推理步骤（“正在生成计划…”，“处理中”，“正在分析数据…”）。', 'zh-TW': '動態推理步驟（「正在產生計畫…」、「處理中」、「正在分析資料…」）。', ja: '動的な推論ステップ（「計画を生成中…」「処理中」「データを分析中…」）。', ko: '동적 추론 단계(“계획 생성 중…”, “처리 중”, “데이터 분석 중…”).' },
    'Interim chunks with': { 'zh-CN': '带有', 'zh-TW': '帶有', ja: '\u200B', ko: '\u200B' },
    'cumulative growing text': { 'zh-CN': '累积增长文本', 'zh-TW': '累積增長文字', ja: '累積的に増えるテキスト', ko: '누적되어 커지는 텍스트' },
    '. Many per answer (we saw 150+).': { 'zh-CN': '的中间分块。每个回答会有很多（我们看到 150+）。', 'zh-TW': '的中繼區塊。每個回答會有很多（我們看到 150+）。', ja: 'を含む途中チャンク。1 回答あたり多数（150+ を確認）。', ko: '가 있는 중간 청크. 답변 하나에 많이 발생합니다(150개 이상 확인).' },
    'The concluded message that replaces the growing bubble.': { 'zh-CN': '替换增长气泡的最终消息。', 'zh-TW': '取代增長泡泡的最終訊息。', ja: '成長中のバブルを置き換える完了メッセージ。', ko: '커지는 버블을 대체하는 완료 메시지입니다.' },
    'All chunks of one answer share a': { 'zh-CN': '同一个回答的所有分块共享同一个', 'zh-TW': '同一個回答的所有區塊共享同一個', ja: '1 つの回答の全チャンクは同じ', ko: '하나의 답변에 속한 모든 청크는 동일한' },
    ', but every chunk has its own unique': { 'zh-CN': '，但每个分块都有自己的唯一', 'zh-TW': '，但每個區塊都有自己的唯一', ja: 'を共有しますが、各チャンクには固有の', ko: '를 공유하지만 각 청크에는 고유한' },
    'activity id': { 'zh-CN': 'activity id', 'zh-TW': 'activity id', ja: 'activity id', ko: 'activity id' },
    '. That single fact causes the biggest gotcha.': { 'zh-CN': '。这一个事实造成了最大的坑。', 'zh-TW': '。這一個事實造成了最大的坑。', ja: 'があります。この 1 点が最大の落とし穴です。', ko: '가 있습니다. 이 한 가지가 가장 큰 함정입니다.' },
    'The Good News': { 'zh-CN': '好消息', 'zh-TW': '好消息', ja: '良いニュース', ko: '좋은 소식' },
    'What\'s working ✅': { 'zh-CN': '哪些可行 ✅', 'zh-TW': '哪些可行 ✅', ja: '動作していること ✅', ko: '동작하는 것 ✅' },
    '✅ Token-by-token streaming (DtE': { 'zh-CN': '✅ 逐 token 流式响应（DtE', 'zh-TW': '✅ 逐 token 串流（DtE', ja: '✅ token 単位のストリーミング（DtE', ko: '✅ 토큰 단위 스트리밍(DtE' },
    'and': { 'zh-CN': '和', 'zh-TW': '和', ja: 'と', ko: '및' },
    'DL)': { 'zh-CN': 'DL）', 'zh-TW': 'DL）', ja: 'DL）', ko: 'DL)' },
    'Both transports stream: the Direct-to-Engine SDK': { 'zh-CN': '两种传输都可流式响应：Direct-to-Engine SDK', 'zh-TW': '兩種傳輸都可串流：Direct-to-Engine SDK', ja: '両方のトランスポートでストリーミングできます: Direct-to-Engine SDK は', ko: '두 전송 모두 스트리밍됩니다. Direct-to-Engine SDK는' },
    'natively': { 'zh-CN': '原生支持', 'zh-TW': '原生支援', ja: 'ネイティブに', ko: '기본적으로' },
    ', and Direct Line once the client sends': { 'zh-CN': '，Direct Line 则在客户端发送', 'zh-TW': '，Direct Line 則在用戶端傳送', ja: '、Direct Line はクライアントが', ko: ', Direct Line은 클라이언트가' },
    '. Same informative → streaming → final chunks either way.': { 'zh-CN': '后支持。两种方式得到相同的 informative → streaming → final 分块。', 'zh-TW': '後支援。兩種方式得到相同的 informative → streaming → final 區塊。', ja: 'を送信すると動作します。どちらも informative → streaming → final の同じチャンクです。', ko: '을 보내면 동작합니다. 어느 쪽이든 informative → streaming → final 청크가 동일합니다.' },
    '✅ Single growing bubble': { 'zh-CN': '✅ 单个增长气泡', 'zh-TW': '✅ 單一增長泡泡', ja: '✅ 1 つの成長するバブル', ko: '✅ 하나의 커지는 버블' },
    'Forcing the activity': { 'zh-CN': '强制将活动', 'zh-TW': '強制將活動', ja: 'アクティビティの', ko: '활동' },
    'makes Web Chat update': { 'zh-CN': '会让 Web Chat 更新', 'zh-TW': '會讓 Web Chat 更新', ja: 'にすると Web Chat は', ko: '로 강제하면 Web Chat이' },
    'one': { 'zh-CN': '一个', 'zh-TW': '一個', ja: '1 つの', ko: '하나의' },
    'bubble in place — verified growing 8 → 1385 chars in a single message.': { 'zh-CN': '气泡 — 已验证单条消息从 8 增长到 1385 个字符。', 'zh-TW': '泡泡 — 已驗證單一訊息從 8 增長到 1385 個字元。', ja: 'バブルだけをその場で更新します — 1 メッセージで 8 → 1385 文字まで成長することを確認。', ko: '버블을 제자리에서 업데이트합니다 — 단일 메시지가 8 → 1385자로 커지는 것을 확인했습니다.' },
    '✅ Dynamic "thought process"': { 'zh-CN': '✅ 动态“思考过程”', 'zh-TW': '✅ 動態「思考過程」', ja: '✅ 動的な「思考プロセス」', ko: '✅ 동적 “사고 과정”' },
    'The': { 'zh-CN': '这些', 'zh-TW': '這些', ja: 'この', ko: '이' },
    'chunks are real reasoning steps. We render them as a styled timeline that disappears the moment the answer streams.': { 'zh-CN': '分块是真实的推理步骤。我们将其渲染为样式化时间线，在回答开始流式输出时消失。', 'zh-TW': '區塊是真實的推理步驟。我們將其呈現為樣式化時間軸，在回答開始串流時消失。', ja: 'チャンクは実際の推論ステップです。スタイル付きタイムラインとして描画し、回答が流れ始めた瞬間に消します。', ko: '청크는 실제 추론 단계입니다. 스타일이 적용된 타임라인으로 렌더링하고 답변이 스트리밍되는 순간 사라지게 합니다.' },
    '✅ Auto-scroll & diagnostics': { 'zh-CN': '✅ 自动滚动与诊断', 'zh-TW': '✅ 自動捲動與診斷', ja: '✅ 自動スクロールと診断', ko: '✅ 자동 스크롤 및 진단' },
    'A MutationObserver keeps the view pinned to the growing answer. The inspector confirmed 439 chunks across 2 livestreams end-to-end.': { 'zh-CN': 'MutationObserver 会让视图固定在正在增长的回答上。检查器端到端确认了 2 个流会话中的 439 个分块。', 'zh-TW': 'MutationObserver 會讓檢視固定在正在增長的回答上。檢查器端對端確認了 2 個串流工作階段中的 439 個區塊。', ja: 'MutationObserver が成長中の回答にビューを固定します。インスペクターで 2 件のライブストリームにまたがる 439 チャンクをエンドツーエンドで確認しました。', ko: 'MutationObserver가 커지는 답변에 보기를 고정합니다. 검사기에서 2개 라이브스트림의 439개 청크를 엔드투엔드로 확인했습니다.' },
    'With the right normalization, the full modern streaming UX is achievable — single bubble, inline reasoning, live scroll.': { 'zh-CN': '通过正确的规范化，可以实现完整的现代流式 UX — 单气泡、内联推理、实时滚动。', 'zh-TW': '透過正確的正規化，可以實現完整的現代串流 UX — 單一泡泡、內嵌推理、即時捲動。', ja: '適切に正規化すれば、1 つのバブル、インライン推論、ライブ スクロールを備えた現代的なストリーミング UX を実現できます。', ko: '올바른 정규화를 적용하면 단일 버블, 인라인 추론, 실시간 스크롤을 갖춘 최신 스트리밍 UX를 구현할 수 있습니다.' },
    'The Hard Parts': { 'zh-CN': '难点', 'zh-TW': '難點', ja: '難しい点', ko: '어려운 부분' },
    'What\'s not working (out of the box) ⚠️': { 'zh-CN': '哪些开箱即用不可行 ⚠️', 'zh-TW': '哪些開箱即用不可行 ⚠️', ja: 'そのままでは動かないこと ⚠️', ko: '기본 상태에서 동작하지 않는 것 ⚠️' },
    '⚠️ 152 bubbles, not 1': { 'zh-CN': '⚠️ 152 个气泡，而不是 1 个', 'zh-TW': '⚠️ 152 個泡泡，而不是 1 個', ja: '⚠️ 1 つではなく 152 個のバブル', ko: '⚠️ 1개가 아닌 152개 버블' },
    'Web Chat dedupes by activity': { 'zh-CN': 'Web Chat 按活动', 'zh-TW': 'Web Chat 依活動', ja: 'Web Chat はアクティビティの', ko: 'Web Chat은 활동' },
    '. Since every chunk has a unique id, each renders as its own bubble. Long answers exploded into 150+ stacked bubbles.': { 'zh-CN': '去重。由于每个分块都有唯一 id，每个分块都会渲染成自己的气泡。长回答会膨胀成 150+ 个堆叠气泡。', 'zh-TW': '去重。由於每個區塊都有唯一 id，每個區塊都會呈現成自己的泡泡。長回答會膨脹成 150+ 個堆疊泡泡。', ja: 'で重複排除します。各チャンクが一意の id を持つため、それぞれ別バブルとして描画されます。長い回答は 150+ 個の積み重なったバブルになりました。', ko: 'id로 중복 제거합니다. 각 청크에 고유 id가 있으므로 각 청크가 별도 버블로 렌더링됩니다. 긴 답변은 150개 이상의 누적 버블로 폭증했습니다.' },
    '⚠️ Cold observable, one subscriber': { 'zh-CN': '⚠️ 冷 observable，单订阅者', 'zh-TW': '⚠️ Cold observable，單一訂閱者', ja: '⚠️ Cold observable、購読者 1 件', ko: '⚠️ cold observable, 구독자 1개' },
    '⚠️ No auto-scroll on in-place updates': { 'zh-CN': '⚠️ 原位更新不会自动滚动', 'zh-TW': '⚠️ 原位更新不會自動捲動', ja: '⚠️ その場更新では自動スクロールしない', ko: '⚠️ 제자리 업데이트에서는 자동 스크롤 없음' },
    '⚠️ Direct Line needs an explicit opt-in': { 'zh-CN': '⚠️ Direct Line 需要显式 opt-in', 'zh-TW': '⚠️ Direct Line 需要明確 opt-in', ja: '⚠️ Direct Line には明示的な opt-in が必要', ko: '⚠️ Direct Line에는 명시적 opt-in 필요' },
    'The Fixes': { 'zh-CN': '修复方案', 'zh-TW': '修復方案', ja: '修正方法', ko: '수정 방법' },
    'How we reconciled them': { 'zh-CN': '我们如何调和这些差异', 'zh-TW': '我們如何調和這些差異', ja: 'それらをどう調整したか', ko: '이를 조정한 방법' },
    'Two Workable Paths': { 'zh-CN': '两条可行路径', 'zh-TW': '兩條可行路徑', ja: '2 つの実用的なパス', ko: '두 가지 실행 가능한 경로' },
    'Both transports can carry livestream activities': { 'zh-CN': '两种传输都能承载实时流式活动', 'zh-TW': '兩種傳輸都能承載即時串流活動', ja: '両方のトランスポートでライブストリーム アクティビティを運べる', ko: '두 전송 모두 라이브스트림 활동을 전달할 수 있음' },
    '✅ Token streaming verified on DtE and DL': { 'zh-CN': '✅ 已在 DtE 和 DL 上验证 token 流式响应', 'zh-TW': '✅ 已在 DtE 和 DL 上驗證 token 串流', ja: '✅ DtE と DL で token ストリーミングを検証済み', ko: '✅ DtE와 DL에서 토큰 스트리밍 검증' },
    'With a runtime that emits livestream activities, Direct-to-Engine streams natively and Direct Line WebSocket carries the same informative → streaming → final protocol. The client opt-in alone cannot force chunks.': {
      'zh-CN': '当运行时会发出实时流式活动时，Direct-to-Engine 原生流式输出，Direct Line WebSocket 承载相同的 informative → streaming → final 协议。仅靠客户端 opt-in 无法强制产生分块。',
      'zh-TW': '當執行階段會發出即時串流活動時，Direct-to-Engine 原生串流，Direct Line WebSocket 承載相同的 informative → streaming → final 通訊協定。僅靠用戶端 opt-in 無法強制產生區塊。',
      ja: 'ランタイムがライブストリーム アクティビティを送出する場合、Direct-to-Engine はネイティブにストリーミングし、Direct Line WebSocket も同じ informative → streaming → final プロトコルを運びます。クライアントの opt-in だけでチャンクを強制することはできません。',
      ko: '런타임이 라이브스트림 활동을 내보내면 Direct-to-Engine은 기본 스트리밍하고 Direct Line WebSocket은 동일한 informative → streaming → final 프로토콜을 전달합니다. 클라이언트 opt-in만으로 청크를 강제할 수는 없습니다.'
    },
    'Live streaming works on': { 'zh-CN': '实时流式响应适用于', 'zh-TW': '即時串流適用於', ja: 'ライブ ストリーミングは', ko: '실시간 스트리밍은' },
    'transports': { 'zh-CN': '传输', 'zh-TW': '傳輸', ja: 'トランスポートで動作します', ko: '전송에서 동작합니다' },
    '✅ Direct-to-Engine (DtE) SDK': { 'zh-CN': '✅ Direct-to-Engine (DtE) SDK', 'zh-TW': '✅ Direct-to-Engine (DtE) SDK', ja: '✅ Direct-to-Engine (DtE) SDK', ko: '✅ Direct-to-Engine(DtE) SDK' },
    'No extra client opt-in.': { 'zh-CN': '无需额外的客户端 opt-in。', 'zh-TW': '不需要額外的用戶端 opt-in。', ja: 'クライアント側の追加 opt-in は不要です。', ko: '추가 클라이언트 opt-in이 필요하지 않습니다.' },
    'is the native SDK path. The selected agent/runtime may still return final-only. Entra (MSAL) sign-in; no secret in the browser.': {
      'zh-CN': '是原生 SDK 路径。所选智能体/运行时仍可能仅返回最终消息。Entra (MSAL) 登录；浏览器中没有密钥。',
      'zh-TW': '是原生 SDK 路徑。所選代理程式/執行階段仍可能僅傳回最終訊息。Entra (MSAL) 登入；瀏覽器中沒有密鑰。',
      ja: 'はネイティブ SDK の経路です。選択したエージェント/ランタイムが final のみを返す場合もあります。Entra (MSAL) サインインを使い、ブラウザーにシークレットはありません。',
      ko: '는 기본 SDK 경로입니다. 선택한 에이전트/런타임이 최종 메시지만 반환할 수도 있습니다. Entra(MSAL) 로그인을 사용하며 브라우저에 비밀이 없습니다.'
    },
    'Best for: signed-in users, richest reasoning steps, zero secret exposure.': { 'zh-CN': '最适合：已登录用户、最丰富的推理步骤、零密钥暴露。', 'zh-TW': '最適合：已登入使用者、最豐富的推理步驟、零密鑰暴露。', ja: '最適: サインイン済みユーザー、最も豊かな推論ステップ、シークレット露出ゼロ。', ko: '최적: 로그인 사용자, 가장 풍부한 추론 단계, 비밀 노출 없음.' },
    '✅ Direct Line (DL) + opt-in': { 'zh-CN': '✅ Direct Line (DL) + opt-in', 'zh-TW': '✅ Direct Line (DL) + opt-in', ja: '✅ Direct Line (DL) + opt-in', ko: '✅ Direct Line(DL) + opt-in' },
    '✅ Direct Line WebSocket + empirical opt-in': { 'zh-CN': '✅ Direct Line WebSocket + 实测 opt-in', 'zh-TW': '✅ Direct Line WebSocket + 實測 opt-in', ja: '✅ Direct Line WebSocket + 実測 opt-in', ko: '✅ Direct Line WebSocket + 실측 opt-in' },
    'WebSocket is a supported livestreaming channel. The playground also sends the': {
      'zh-CN': 'WebSocket 是受支持的实时流式通道。体验场还会发送',
      'zh-TW': 'WebSocket 是受支援的即時串流通道。體驗場還會傳送',
      ja: 'WebSocket はサポートされるライブストリーミング チャネルです。プレイグラウンドは',
      ko: 'WebSocket은 지원되는 라이브스트리밍 채널입니다. 플레이그라운드는'
    },
    'opt-in observed in the Copilot Studio canvas. Actual chunks still depend on the selected agent/runtime emitting valid livestream activities.': {
      'zh-CN': '在 Copilot Studio 画布中观察到的 opt-in。是否真正产生分块仍取决于所选智能体/运行时是否发出有效的实时流式活动。',
      'zh-TW': '在 Copilot Studio 畫布中觀察到的 opt-in。是否真正產生區塊仍取決於所選代理程式/執行階段是否發出有效的即時串流活動。',
      ja: 'という Copilot Studio キャンバスで観測した opt-in も送ります。実際のチャンクは、選択したエージェント/ランタイムが有効なライブストリーム アクティビティを送出するかどうかに依存します。',
      ko: '이라는 Copilot Studio 캔버스에서 관측된 opt-in도 보냅니다. 실제 청크는 선택한 에이전트/런타임이 유효한 라이브스트림 활동을 내보내는지에 달려 있습니다.'
    },
    'GHCP boundary:': { 'zh-CN': 'GHCP 边界：', 'zh-TW': 'GHCP 界線：', ja: 'GHCP の境界:', ko: 'GHCP 경계:' },
    'current GHCP docs list Web app iframe support, but Native app / Direct Line is unavailable. Use authenticated': { 'zh-CN': '当前 GHCP 文档列出 Web app iframe 支持，但 Native app / Direct Line 不可用。请使用经过身份验证的', 'zh-TW': '目前 GHCP 文件列出 Web app iframe 支援，但 Native app / Direct Line 不可用。請使用經過驗證的', ja: '現在の GHCP ドキュメントでは Web app iframe はサポートされていますが、Native app / Direct Line は利用できません。認証付き', ko: '현재 GHCP 문서는 Web app iframe을 지원하지만 Native app / Direct Line은 사용할 수 없다고 명시합니다. 인증된' },
    'for experimental GHCP testing.': { 'zh-CN': '进行实验性 GHCP 测试。', 'zh-TW': '進行實驗性 GHCP 測試。', ja: 'を試験的な GHCP テストに使用します。', ko: '를 실험적 GHCP 테스트에 사용하세요.' },
    'Best for: standard-harness or no-auth Direct Line diagnostics.': { 'zh-CN': '最适合：标准框架或无身份验证的 Direct Line 诊断。', 'zh-TW': '最適合：標準框架或無驗證的 Direct Line 診斷。', ja: '最適: 標準ハーネスまたは認証なし Direct Line の診断。', ko: '최적: 표준 하네스 또는 인증 없는 Direct Line 진단.' },
    'Agent prerequisite:': { 'zh-CN': '智能体前提条件：', 'zh-TW': '代理程式前提條件：', ja: 'エージェント前提条件:', ko: '에이전트 전제 조건:' },
    'the agent flag': { 'zh-CN': '智能体标志', 'zh-TW': '代理程式旗標', ja: 'エージェント フラグ', ko: '에이전트 플래그' },
    'must be': { 'zh-CN': '必须为', 'zh-TW': '必須為', ja: 'は', ko: '는' },
    'ON': { 'zh-CN': '开启', 'zh-TW': '開啟', ja: 'オン', ko: '켜짐' },
    ', or Direct Line never emits streaming chunks no matter what the client sends.': { 'zh-CN': '，否则无论客户端发送什么，Direct Line 都不会发出流式分块。', 'zh-TW': '，否則無論用戶端傳送什麼，Direct Line 都不會發出串流區塊。', ja: 'である必要があります。そうでないと、クライアントが何を送っても Direct Line はストリーミング チャンクを出しません。', ko: '이어야 합니다. 그렇지 않으면 클라이언트가 무엇을 보내도 Direct Line은 스트리밍 청크를 내보내지 않습니다.' },
    'Best for: anonymous / token-endpoint embedding, parity with the official test canvas.': { 'zh-CN': '最适合：匿名 / 令牌终结点嵌入，以及与官方测试画布保持一致。', 'zh-TW': '最適合：匿名 / 權杖端點嵌入，以及與官方測試畫布保持一致。', ja: '最適: 匿名 / トークン エンドポイント埋め込み、公式テスト キャンバスとの同等性。', ko: '최적: 익명 / 토큰 엔드포인트 임베딩, 공식 테스트 캔버스와의 동등성.' },
    'Technical Architecture': { 'zh-CN': '技术架构', 'zh-TW': '技術架構', ja: '技術アーキテクチャ', ko: '기술 아키텍처' },
    'Components behind the streaming playground': { 'zh-CN': '流式聊天体验场背后的组件', 'zh-TW': '串流聊天體驗場背後的元件', ja: 'ストリーミング プレイグラウンドを支えるコンポーネント', ko: '스트리밍 플레이그라운드를 구성하는 컴포넌트' },
    'Browser': { 'zh-CN': '浏览器', 'zh-TW': '瀏覽器', ja: 'ブラウザー', ko: '브라우저' },
    'normalization tap · stream coalescing · diagnostics inspector · auto-scroll': { 'zh-CN': '规范化 tap · 流合并 · 诊断检查器 · 自动滚动', 'zh-TW': '正規化 tap · 串流合併 · 診斷檢查器 · 自動捲動', ja: '正規化 tap · ストリーム集約 · 診断インスペクター · 自動スクロール', ko: '정규화 tap · 스트림 병합 · 진단 검사기 · 자동 스크롤' },
    'Direct-to-Engine (DtE)': { 'zh-CN': 'Direct-to-Engine (DtE)', 'zh-TW': 'Direct-to-Engine (DtE)', ja: 'Direct-to-Engine (DtE)', ko: 'Direct-to-Engine(DtE)' },
    'Direct Line (DL)': { 'zh-CN': 'Direct Line (DL)', 'zh-TW': 'Direct Line (DL)', ja: 'Direct Line (DL)', ko: 'Direct Line(DL)' },
    'Native streaming — no client opt-in.': { 'zh-CN': '原生流式响应 — 无需客户端 opt-in。', 'zh-TW': '原生串流 — 不需要用戶端 opt-in。', ja: 'ネイティブ ストリーミング — クライアント opt-in 不要。', ko: '기본 스트리밍 — 클라이언트 opt-in 불필요.' },
    'WebSocket carries chunks only when the runtime emits valid livestream activities.': { 'zh-CN': '只有当运行时发出有效的实时流式活动时，WebSocket 才会承载分块。', 'zh-TW': '只有當執行階段發出有效的即時串流活動時，WebSocket 才會承載區塊。', ja: 'WebSocket がチャンクを運ぶのは、ランタイムが有効なライブストリーム アクティビティを送出する場合だけです。', ko: 'WebSocket은 런타임이 유효한 라이브스트림 활동을 내보낼 때만 청크를 전달합니다.' },
    'Transport capability is necessary, not sufficient: the activity inspector is the proof. No streamType metadata means the response was final-only.': { 'zh-CN': '传输能力是必要条件，但不是充分条件：活动检查器才是证据。没有 streamType 元数据意味着响应仅包含最终消息。', 'zh-TW': '傳輸能力是必要條件，但不是充分條件：活動檢查器才是證據。沒有 streamType 中繼資料代表回應僅包含最終訊息。', ja: 'トランスポート対応は必要条件ですが十分条件ではありません。証拠はアクティビティ インスペクターです。streamType メタデータがなければ、応答は final のみです。', ko: '전송 기능은 필요조건일 뿐 충분조건이 아닙니다. 활동 검사기가 증거입니다. streamType 메타데이터가 없으면 응답은 최종 메시지만 전달된 것입니다.' },
    'Needs': { 'zh-CN': '需要', 'zh-TW': '需要', ja: '必要:', ko: '필요:' },
    '= ON.': { 'zh-CN': '= 开启。', 'zh-TW': '= 開啟。', ja: '= オン。', ko: '= 켜짐.' },
    'Copilot Studio agent': { 'zh-CN': 'Copilot Studio 智能体', 'zh-TW': 'Copilot Studio 代理程式', ja: 'Copilot Studio エージェント', ko: 'Copilot Studio 에이전트' },
    'emits': { 'zh-CN': '发出', 'zh-TW': '發出', ja: '送出:', ko: '내보냄:' },
    'activities': { 'zh-CN': '活动', 'zh-TW': '活動', ja: 'アクティビティ', ko: '활동' },
    'Testing Flow': { 'zh-CN': '测试流程', 'zh-TW': '測試流程', ja: 'テスト フロー', ko: '테스트 흐름' },
    'How the components interact during a test run': { 'zh-CN': '测试运行期间组件如何交互', 'zh-TW': '測試執行期間元件如何互動', ja: 'テスト実行中のコンポーネントのやり取り', ko: '테스트 실행 중 컴포넌트 상호작용' },
    '1 · run': { 'zh-CN': '1 · 运行', 'zh-TW': '1 · 執行', ja: '1 · 実行', ko: '1 · 실행' },
    '2 · pick mode': { 'zh-CN': '2 · 选择模式', 'zh-TW': '2 · 選擇模式', ja: '2 · モード選択', ko: '2 · 모드 선택' },
    '3 · token': { 'zh-CN': '3 · 令牌', 'zh-TW': '3 · 權杖', ja: '3 · トークン', ko: '3 · 토큰' },
    '4 · connect': { 'zh-CN': '4 · 连接', 'zh-TW': '4 · 連線', ja: '4 · 接続', ko: '4 · 연결' },
    '5 · prompt': { 'zh-CN': '5 · 提示词', 'zh-TW': '5 · 提示詞', ja: '5 · プロンプト', ko: '5 · 프롬프트' },
    '6 · stream': { 'zh-CN': '6 · 流式输出', 'zh-TW': '6 · 串流輸出', ja: '6 · ストリーム', ko: '6 · 스트림' },
    '7 · verify': { 'zh-CN': '7 · 验证', 'zh-TW': '7 · 驗證', ja: '7 · 検証', ko: '7 · 확인' },
    'A passing run =': { 'zh-CN': '通过的运行 =', 'zh-TW': '通過的執行 =', ja: '合格する実行 =', ko: '통과 실행 =' },
    ', one clean growing bubble, full markdown, and no duplicate final.': { 'zh-CN': '，一个干净增长的气泡、完整 Markdown、且没有重复 final。', 'zh-TW': '，一個乾淨增長的泡泡、完整 Markdown、且沒有重複 final。', ja: '、きれいに成長する 1 つのバブル、完全な Markdown、重複 final なし。', ko: ', 깔끔하게 커지는 하나의 버블, 완전한 Markdown, 중복 final 없음.' },
    'Field Notes': { 'zh-CN': '现场笔记', 'zh-TW': '現場筆記', ja: 'フィールド ノート', ko: '현장 노트' },
    'Smaller gotchas worth knowing': { 'zh-CN': '值得了解的小坑', 'zh-TW': '值得了解的小坑', ja: '知っておくべき小さな落とし穴', ko: '알아두면 좋은 작은 주의점' },
    'TAKEAWAYS': { 'zh-CN': '要点', 'zh-TW': '重點', ja: '要点', ko: '핵심 요점' },
    'If you remember three things': { 'zh-CN': '如果只记住三件事', 'zh-TW': '如果只記住三件事', ja: '覚えるべき 3 点', ko: '세 가지만 기억한다면' },
    'Repo': { 'zh-CN': '仓库', 'zh-TW': '存放庫', ja: 'リポジトリ', ko: '리포지토리' },
    'Questions?': { 'zh-CN': '有问题？', 'zh-TW': '有問題？', ja: '質問は？', ko: '질문이 있나요?' },
    'Reach out — happy to walk through the inspector live.': { 'zh-CN': '欢迎联系 — 很乐意现场演示检查器。', 'zh-TW': '歡迎聯絡 — 很樂意現場示範檢查器。', ja: 'ご連絡ください — インスペクターをライブで一緒に見られます。', ko: '연락 주세요 — 검사기를 라이브로 함께 살펴보겠습니다.' },
    'Export this deck as PowerPoint (.pptx)': { 'zh-CN': '将此演示文稿导出为 PowerPoint (.pptx)', 'zh-TW': '將此簡報匯出為 PowerPoint (.pptx)', ja: 'このデッキを PowerPoint (.pptx) としてエクスポート', ko: '이 데크를 PowerPoint(.pptx)로 내보내기' },
    'Export PPT': { 'zh-CN': '导出 PPT', 'zh-TW': '匯出 PPT', ja: 'PPT を出力', ko: 'PPT 내보내기' },
    'Export deck to PowerPoint (.pptx)': { 'zh-CN': '将演示文稿导出为 PowerPoint (.pptx)', 'zh-TW': '將簡報匯出為 PowerPoint (.pptx)', ja: 'デッキを PowerPoint (.pptx) にエクスポート', ko: '데크를 PowerPoint(.pptx)로 내보내기' },
    '◑ Theme': { 'zh-CN': '◑ 主题', 'zh-TW': '◑ 佈景主題', ja: '◑ テーマ', ko: '◑ 테마' },
    'Theme': { 'zh-CN': '主题', 'zh-TW': '佈景主題', ja: 'テーマ', ko: '테마' },
    'Previous slide': { 'zh-CN': '上一张幻灯片', 'zh-TW': '上一張投影片', ja: '前のスライド', ko: '이전 슬라이드' },
    'Next slide': { 'zh-CN': '下一张幻灯片', 'zh-TW': '下一張投影片', ja: '次のスライド', ko: '다음 슬라이드' },
    '← → arrows · F fullscreen': { 'zh-CN': '← → 方向键 · F 全屏', 'zh-TW': '← → 方向鍵 · F 全螢幕', ja: '← → キー · F 全画面', ko: '← → 화살표 · F 전체 화면' },
    'Generating PowerPoint…': { 'zh-CN': '正在生成 PowerPoint…', 'zh-TW': '正在產生 PowerPoint…', ja: 'PowerPoint を生成中…', ko: 'PowerPoint 생성 중…' },
    'Done — saved Streaming-Responses-in-Copilot-Studio.pptx': { 'zh-CN': '完成 — 已保存 Streaming-Responses-in-Copilot-Studio.pptx', 'zh-TW': '完成 — 已儲存 Streaming-Responses-in-Copilot-Studio.pptx', ja: '完了 — Streaming-Responses-in-Copilot-Studio.pptx を保存しました', ko: '완료 — Streaming-Responses-in-Copilot-Studio.pptx 저장됨' },
    'PowerPoint library failed to load (check your network).': { 'zh-CN': 'PowerPoint 库加载失败（请检查网络）。', 'zh-TW': 'PowerPoint 程式庫載入失敗（請檢查網路）。', ja: 'PowerPoint ライブラリの読み込みに失敗しました（ネットワークを確認してください）。', ko: 'PowerPoint 라이브러리를 로드하지 못했습니다(네트워크 확인).' },
    'Export failed: {message}': { 'zh-CN': '导出失败：{message}', 'zh-TW': '匯出失敗：{message}', ja: 'エクスポートに失敗しました: {message}', ko: '내보내기 실패: {message}' },
    // --- Slide 6 (The Hard Parts) ---
    'Web Chat dedupes by activity id. Since every chunk has a unique id, each renders as its own bubble. Long answers exploded into 150+ stacked bubbles.': {
      'zh-CN': 'Web Chat 按活动 id 去重。由于每个分块都有唯一的 id，每个分块都会渲染成自己的气泡。长回答会膨胀成 150+ 个堆叠气泡。',
      'zh-TW': 'Web Chat 依活動 id 去重。由於每個區塊都有唯一的 id，每個區塊都會呈現成自己的泡泡。長回答會膨脹成 150+ 個堆疊泡泡。',
      ja: 'Web Chat はアクティビティ id で重複排除します。各チャンクが一意の id を持つため、それぞれが別々のバブルとして描画されます。長い回答は 150+ 個の積み重なったバブルに膨れ上がりました。',
      ko: 'Web Chat은 활동 id로 중복을 제거합니다. 각 청크가 고유한 id를 갖기 때문에 각 청크가 자체 버블로 렌더링됩니다. 긴 답변은 150개 이상의 쌓인 버블로 폭증했습니다.'
    },
    'The SDK\'s': { 'zh-CN': 'SDK 的', 'zh-TW': 'SDK 的', ja: 'SDK の', ko: 'SDK의' },
    'is cold with a single internal subscriber. Subscribe twice (e.g. for an inspector) and one observer goes blind.': {
      'zh-CN': '是冷的，只有一个内部订阅者。订阅两次（例如为了检查器）会让其中一个观察者收不到数据。',
      'zh-TW': '是冷的，只有一個內部訂閱者。訂閱兩次（例如為了檢查器）會讓其中一個觀察者收不到資料。',
      ja: 'はコールドで、内部購読者は 1 件だけです。2 回購読すると（例: インスペクター用に）一方のオブザーバーがデータを受け取れなくなります。',
      ko: '는 콜드이며 내부 구독자가 하나뿐입니다. 두 번 구독하면(예: 검사기용) 한 옵저버가 데이터를 받지 못하게 됩니다.'
    },
    'Web Chat only auto-pins on new activities. A streaming answer updates the same id, so the view stays put while content grows off-screen.': {
      'zh-CN': 'Web Chat 只在出现新活动时才自动固定到底部。流式回答更新的是同一个 id，因此视图保持不动，而内容在屏幕外不断增长。',
      'zh-TW': 'Web Chat 只在出現新活動時才自動固定到底部。串流回答更新的是同一個 id，因此檢視保持不動，而內容在畫面外不斷增長。',
      ja: 'Web Chat は新しいアクティビティのときだけ自動的に最下部へ固定します。ストリーミング回答は同じ id を更新するため、ビューは動かず、内容は画面外で増えていきます。',
      ko: 'Web Chat은 새 활동이 있을 때만 자동으로 하단에 고정됩니다. 스트리밍 답변은 동일한 id를 업데이트하므로 보기는 그대로 있고 콘텐츠는 화면 밖에서 계속 커집니다.'
    },
    'Plain Web Chat over Direct Line paints only the final message — until the client sends': {
      'zh-CN': '通过 Direct Line 的纯 Web Chat 只会绘制最终消息 —— 直到客户端发送',
      'zh-TW': '透過 Direct Line 的純 Web Chat 只會繪製最終訊息 —— 直到用戶端傳送',
      ja: 'Direct Line 上の素の Web Chat は最終メッセージのみを描画します — クライアントが',
      ko: 'Direct Line의 일반 Web Chat은 최종 메시지만 그립니다 — 클라이언트가'
    },
    '. Miss the opt-in and you\'ll wrongly conclude DL can\'t stream (we did, at first).': {
      'zh-CN': '。漏掉这个 opt-in，你就会错误地以为 DL 无法流式响应（我们一开始就是如此）。',
      'zh-TW': '。漏掉這個 opt-in，你就會錯誤地以為 DL 無法串流（我們一開始就是如此）。',
      ja: 'を送信するまで。この opt-in を見落とすと、DL はストリーミングできないと誤解します（私たちも最初はそうでした）。',
      ko: '를 보낼 때까지요. 이 opt-in을 놓치면 DL이 스트리밍할 수 없다고 잘못 결론짓게 됩니다(처음엔 우리도 그랬습니다).'
    },
    'None of these are bugs exactly — they\'re mismatched assumptions between the SDK\'s streaming model and Web Chat\'s transcript model.': {
      'zh-CN': '这些并不完全是 bug —— 而是 SDK 的流式模型与 Web Chat 的 transcript 模型之间存在不匹配的假设。',
      'zh-TW': '這些並不完全是 bug —— 而是 SDK 的串流模型與 Web Chat 的 transcript 模型之間存在不相符的假設。',
      ja: 'これらは厳密にはバグではなく、SDK のストリーミング モデルと Web Chat のトランスクリプト モデルの間にある前提のミスマッチです。',
      ko: '이들은 정확히 버그가 아니라 SDK의 스트리밍 모델과 Web Chat의 트랜스크립트 모델 사이의 맞지 않는 가정입니다.'
    },
    // --- Slide 7 (The Fixes) ---
    'Stamp': { 'zh-CN': '把', 'zh-TW': '把', ja: 'スタンプ:', ko: '스탬프:' },
    'on every interim chunk so Web Chat groups them into one growing message (also set': {
      'zh-CN': '盖到每个中间分块上，让 Web Chat 把它们归并为一条不断增长的消息（同时设置',
      'zh-TW': '蓋到每個中間區塊上，讓 Web Chat 把它們歸併為一條不斷增長的訊息（同時設定',
      ja: 'を各途中チャンクに付与し、Web Chat がそれらを 1 つの成長するメッセージにまとめます（さらに',
      ko: '를 각 중간 청크에 찍어 Web Chat이 이를 하나의 커지는 메시지로 묶습니다(또한'
    },
    'Single subscription + tap pattern — wrap the SDK connection once, then tap each activity for both the inspector and Web Chat. Never subscribe to': {
      'zh-CN': '单订阅 + tap 模式 —— 只包装一次 SDK 连接，然后为检查器和 Web Chat 各自 tap 每个活动。绝不要订阅',
      'zh-TW': '單一訂閱 + tap 模式 —— 只包裝一次 SDK 連線，然後為檢查器和 Web Chat 各自 tap 每個活動。絕不要訂閱',
      ja: 'シングル サブスクリプション + tap パターン — SDK 接続を一度だけラップし、インスペクターと Web Chat の両方に各アクティビティを tap します。決して',
      ko: '단일 구독 + tap 패턴 — SDK 연결을 한 번만 래핑한 뒤 검사기와 Web Chat 모두에 각 활동을 tap합니다. 절대'
    },
    'twice.': { 'zh-CN': '两次。', 'zh-TW': '兩次。', ja: 'を 2 回購読しないでください。', ko: '를 두 번 구독하지 마세요.' },
    'MutationObserver auto-scroll — watch the transcript DOM and snap to bottom while the user is near the bottom (respects manual scroll-up).': {
      'zh-CN': 'MutationObserver 自动滚动 —— 监视 transcript DOM，当用户靠近底部时贴到底部（尊重手动向上滚动）。',
      'zh-TW': 'MutationObserver 自動捲動 —— 監視 transcript DOM，當使用者靠近底部時貼到底部（尊重手動向上捲動）。',
      ja: 'MutationObserver による自動スクロール — transcript の DOM を監視し、ユーザーが最下部付近にいるときは最下部にスナップします（手動の上スクロールは尊重）。',
      ko: 'MutationObserver 자동 스크롤 — transcript DOM을 관찰하여 사용자가 하단 근처에 있을 때 하단으로 스냅합니다(수동 위로 스크롤은 존중).'
    },
    'Withhold informative chunks from Web Chat — route them to the custom "thought process" card instead, then fade it when': {
      'zh-CN': '不要把 informative 分块交给 Web Chat —— 而是将它们路由到自定义的“思考过程”卡片，然后在',
      'zh-TW': '不要把 informative 區塊交給 Web Chat —— 而是將它們路由到自訂的「思考過程」卡片，然後在',
      ja: 'informative チャンクを Web Chat に渡さず — 代わりにカスタムの「思考プロセス」カードへ振り分け、',
      ko: 'informative 청크를 Web Chat에 넘기지 말고 — 대신 사용자 지정 "사고 과정" 카드로 라우팅한 다음,'
    },
    'begins.': { 'zh-CN': '开始时淡出它。', 'zh-TW': '開始時淡出它。', ja: 'が開始したらフェードアウトさせます。', ko: '이 시작되면 페이드아웃합니다.' },
    'Every fix lives in a thin normalization layer between the SDK connection and Web Chat — no forks, no patched libraries.': {
      'zh-CN': '每个修复都位于 SDK 连接与 Web Chat 之间一层薄薄的规范化层中 —— 没有分叉，也没有打补丁的库。',
      'zh-TW': '每個修復都位於 SDK 連線與 Web Chat 之間一層薄薄的正規化層中 —— 沒有分支，也沒有修補過的程式庫。',
      ja: 'すべての修正は、SDK 接続と Web Chat の間にある薄い正規化レイヤーに収まっています — フォークも、パッチを当てたライブラリもありません。',
      ko: '모든 수정은 SDK 연결과 Web Chat 사이의 얇은 정규화 레이어에 들어 있습니다 — 포크도, 패치한 라이브러리도 없습니다.'
    },
    // --- Slide 8 (Two Workable Paths) ---
    'both': { 'zh-CN': '两种', 'zh-TW': '兩種', ja: '両方の', ko: '두' },
    'Standard Web Chat over Direct Line paints only the final message': {
      'zh-CN': 'Direct Line 上的标准 Web Chat 只会绘制最终消息',
      'zh-TW': 'Direct Line 上的標準 Web Chat 只會繪製最終訊息',
      ja: 'Direct Line 上の標準 Web Chat は最終メッセージのみを描画します',
      ko: 'Direct Line의 표준 Web Chat은 최종 메시지만 그립니다'
    },
    'until': { 'zh-CN': '，直到', 'zh-TW': '，直到', ja: '。次の場合まで —', ko: '. 다음 전까지 —' },
    'the client signals': { 'zh-CN': '客户端发出信号', 'zh-TW': '用戶端發出信號', ja: 'クライアントが通知:', ko: '클라이언트가 신호를 보냄:' },
    '— then the same': { 'zh-CN': '—— 然后相同的', 'zh-TW': '—— 然後相同的', ja: '— その後、同じ', ko: '— 그런 다음 동일한' },
    'chunks flow over the WebSocket.': { 'zh-CN': '分块通过 WebSocket 流动。', 'zh-TW': '區塊透過 WebSocket 流動。', ja: 'チャンクが WebSocket を流れます。', ko: '청크가 WebSocket을 통해 흐릅니다.' },
    'Verified against the same agent: DtE streams natively; DL streams the instant you send': {
      'zh-CN': '针对同一个智能体验证：DtE 原生流式响应；DL 在你发送',
      'zh-TW': '針對同一個代理程式驗證：DtE 原生串流；DL 在你傳送',
      ja: '同じエージェントで検証済み: DtE はネイティブにストリーミング。DL は次を送信した瞬間にストリーミング:',
      ko: '동일한 에이전트로 검증: DtE는 기본 스트리밍, DL은 다음을 보내는 즉시 스트리밍:'
    },
    '(with': { 'zh-CN': '（在', 'zh-TW': '（在', ja: '（', ko: '(' },
    'ON)': { 'zh-CN': '为开启时）', 'zh-TW': '為開啟時）', ja: 'がオンの場合）', ko: '이 켜진 경우)' },
    '— confirmed': { 'zh-CN': '—— 实测', 'zh-TW': '—— 實測', ja: '— 確認:', ko: '— 확인:' },
    '1 livestream / 84 chunks / 1 finalized': { 'zh-CN': '1 个实时流 / 84 个分块 / 1 个最终', 'zh-TW': '1 個即時串流 / 84 個區塊 / 1 個最終', ja: '1 ライブストリーム / 84 チャンク / 1 ファイナライズ', ko: '1 라이브스트림 / 84 청크 / 1 최종' },
    // --- Slide 9 (Architecture) ---
    '· Bot Framework Web Chat (CDN) +': { 'zh-CN': '· Bot Framework Web Chat（CDN）+', 'zh-TW': '· Bot Framework Web Chat（CDN）+', ja: '· Bot Framework Web Chat（CDN）+', ko: '· Bot Framework Web Chat(CDN) +' },
    '↓ token': { 'zh-CN': '↓ 令牌', 'zh-TW': '↓ 權杖', ja: '↓ トークン', ko: '↓ 토큰' },
    'MSAL browser — Entra access token': { 'zh-CN': 'MSAL 浏览器 — Entra 访问令牌', 'zh-TW': 'MSAL 瀏覽器 — Entra 存取權杖', ja: 'MSAL ブラウザー — Entra アクセス トークン', ko: 'MSAL 브라우저 — Entra 액세스 토큰' },
    'Direct-to-Engine endpoint': { 'zh-CN': 'Direct-to-Engine 终结点', 'zh-TW': 'Direct-to-Engine 端點', ja: 'Direct-to-Engine エンドポイント', ko: 'Direct-to-Engine 엔드포인트' },
    '(Web Chat) +': { 'zh-CN': '（Web Chat）+', 'zh-TW': '（Web Chat）+', ja: '（Web Chat）+', ko: '(Web Chat) +' },
    'opt-in': { 'zh-CN': '选择加入', 'zh-TW': '選擇加入', ja: 'オプトイン', ko: '옵트인' },
    'Express relay': { 'zh-CN': 'Express 中继', 'zh-TW': 'Express 中繼', ja: 'Express リレー', ko: 'Express 릴레이' },
    '(secret→token) · or token-endpoint URL': { 'zh-CN': '（密钥→令牌）· 或令牌终结点 URL', 'zh-TW': '（密鑰→權杖）· 或權杖端點 URL', ja: '（シークレット→トークン）· またはトークン エンドポイント URL', ko: '(비밀→토큰) · 또는 토큰 엔드포인트 URL' },
    'Direct Line channel': { 'zh-CN': 'Direct Line 通道', 'zh-TW': 'Direct Line 通道', ja: 'Direct Line チャネル', ko: 'Direct Line 채널' },
    '— emits': { 'zh-CN': '— 发出', 'zh-TW': '— 發出', ja: '— 送出:', ko: '— 내보냄:' },
    'Both transports converge on the': { 'zh-CN': '两种传输都汇聚到', 'zh-TW': '兩種傳輸都匯聚到', ja: '両方のトランスポートは', ko: '두 전송 모두' },
    'same agent': { 'zh-CN': '同一个智能体', 'zh-TW': '同一個代理程式', ja: '同じエージェント', ko: '동일한 에이전트' },
    'and the': { 'zh-CN': '和', 'zh-TW': '和', ja: 'と', ko: '및' },
    'same app.js normalization tap': { 'zh-CN': '同一个 app.js 规范化 tap', 'zh-TW': '同一個 app.js 正規化 tap', ja: '同じ app.js 正規化 tap', ko: '동일한 app.js 정규화 tap' },
    '— only the connection + auth layer differs.': { 'zh-CN': '上 —— 只有连接 + 认证层不同。', 'zh-TW': '上 —— 只有連線 + 驗證層不同。', ja: 'に収束します — 異なるのは接続 + 認証レイヤーだけです。', ko: '에 수렴합니다 — 다른 것은 연결 + 인증 레이어뿐입니다.' },
    // --- Slide 10 (Testing Flow) ---
    'Start Express': { 'zh-CN': '启动 Express', 'zh-TW': '啟動 Express', ja: 'Express を起動:', ko: 'Express 시작:' },
    '— serves the playground.': { 'zh-CN': '—— 提供体验场。', 'zh-TW': '—— 提供體驗場。', ja: '— プレイグラウンドを提供します。', ko: '— 플레이그라운드를 제공합니다.' },
    'Open the playground, choose SDK (DtE) or token / secret / dlStream (DL).': { 'zh-CN': '打开体验场，选择 SDK (DtE) 或 token / secret / dlStream (DL)。', 'zh-TW': '開啟體驗場，選擇 SDK (DtE) 或 token / secret / dlStream (DL)。', ja: 'プレイグラウンドを開き、SDK (DtE) または token / secret / dlStream (DL) を選択します。', ko: '플레이그라운드를 열고 SDK(DtE) 또는 token / secret / dlStream(DL)을 선택합니다.' },
    'DtE: MSAL Entra redirect. DL: Express mints a Direct Line token.': { 'zh-CN': 'DtE：MSAL Entra 重定向。DL：Express 铸造一个 Direct Line 令牌。', 'zh-TW': 'DtE：MSAL Entra 重新導向。DL：Express 鑄造一個 Direct Line 權杖。', ja: 'DtE: MSAL Entra リダイレクト。DL: Express が Direct Line トークンを発行します。', ko: 'DtE: MSAL Entra 리디렉션. DL: Express가 Direct Line 토큰을 발급합니다.' },
    'Web Chat connects; DL also posts': { 'zh-CN': 'Web Chat 连接；DL 还会发送', 'zh-TW': 'Web Chat 連線；DL 還會傳送', ja: 'Web Chat が接続。DL はさらに', ko: 'Web Chat 연결; DL은 또한' },
    'with': { 'zh-CN': '，附带', 'zh-TW': '，附帶', ja: ' とともに', ko: ' 와(과) 함께' },
    'Send a': { 'zh-CN': '发送一个', 'zh-TW': '傳送一個', ja: '次を送信:', ko: '다음을 전송:' },
    'generative': { 'zh-CN': '生成式', 'zh-TW': '生成式', ja: '生成', ko: '생성형' },
    'prompt — only LLM answers stream (not canned topic replies).': { 'zh-CN': '提示词 —— 只有 LLM 答案会流式输出（预设主题回复不会）。', 'zh-TW': '提示詞 —— 只有 LLM 答案會串流（預設主題回覆不會）。', ja: 'プロンプト — ストリーミングされるのは LLM の回答のみです（定型トピック応答は対象外）。', ko: '프롬프트 — LLM 답변만 스트리밍됩니다(미리 정의된 토픽 응답 제외).' },
    'Agent emits informative → streaming → final into': { 'zh-CN': '智能体将 informative → streaming → final 发送到', 'zh-TW': '代理程式將 informative → streaming → final 發送到', ja: 'エージェントは informative → streaming → final を出力:', ko: '에이전트가 informative → streaming → final을 출력:' },
    'one growing bubble': { 'zh-CN': '一个不断增长的气泡', 'zh-TW': '一個不斷增長的泡泡', ja: '1 つの成長するバブル', ko: '하나의 커지는 버블' },
    'Inspector confirms chunk count,': { 'zh-CN': '检查器确认分块计数、', 'zh-TW': '檢查器確認區塊計數、', ja: 'インスペクターはチャンク数、', ko: '검사기가 청크 수,' },
    'grouping & sequence order.': { 'zh-CN': '分组与序列顺序。', 'zh-TW': '分組與序列順序。', ja: 'グループ化、シーケンス順序を確認します。', ko: '그룹화 및 시퀀스 순서를 확인합니다.' },
    '1 livestream / N streaming chunks / 1 finalized': { 'zh-CN': '1 个实时流 / N 个流式分块 / 1 个最终', 'zh-TW': '1 個即時串流 / N 個串流區塊 / 1 個最終', ja: '1 ライブストリーム / N ストリーミング チャンク / 1 ファイナライズ', ko: '1 라이브스트림 / N 스트리밍 청크 / 1 최종' },
    // --- Slide 11 (Field Notes) ---
    'sorts the transcript': { 'zh-CN': '会排序记录', 'zh-TW': '會排序記錄', ja: 'はトランスクリプトを並べ替えます', ko: '은 트랜스크립트를 정렬합니다' },
    'by': { 'zh-CN': '，依据', 'zh-TW': '，依據', ja: '。基準:', ko: '. 기준:' },
    '— get this wrong and bubbles render out of order.': { 'zh-CN': '—— 弄错就会让气泡乱序渲染。', 'zh-TW': '—— 弄錯就會讓泡泡亂序呈現。', ja: '— 値を間違えるとバブルが順不同で表示されます。', ko: '— 값을 잘못 설정하면 버블이 순서 없이 렌더링됩니다.' },
    'on the conversations POST is': { 'zh-CN': '在 conversations POST 上是', 'zh-TW': '在 conversations POST 上是', ja: 'は conversations POST 上で', ko: '는 conversations POST에서' },
    'benign': { 'zh-CN': '良性的', 'zh-TW': '良性的', ja: '無害です', ko: '무해합니다' },
    '— it\'s the SSE stream closing.': { 'zh-CN': ' —— 那只是 SSE 流在关闭。', 'zh-TW': ' —— 那只是 SSE 串流在關閉。', ja: ' — SSE ストリームが閉じているだけです。', ko: ' — SSE 스트림이 닫히는 것일 뿐입니다.' },
    'Token is cached by MSAL, so reconnects are': { 'zh-CN': '令牌由 MSAL 缓存，因此重新连接是', 'zh-TW': '權杖由 MSAL 快取，因此重新連線是', ja: 'トークンは MSAL によりキャッシュされるため、再接続は', ko: '토큰은 MSAL이 캐시하므로 재연결은' },
    'silent': { 'zh-CN': '静默的', 'zh-TW': '靜默的', ja: 'サイレントです', ko: '조용합니다' },
    '(no second sign-in).': { 'zh-CN': '（不会二次登录）。', 'zh-TW': '（不會二次登入）。', ja: '（再サインインなし）。', ko: '(두 번째 로그인 없음).' },
    'Informative chunks carry a': { 'zh-CN': 'Informative 分块带有', 'zh-TW': 'Informative 區塊帶有', ja: 'informative チャンクは', ko: 'informative 청크는' },
    'lower sequence-id': { 'zh-CN': '更低的 sequence-id', 'zh-TW': '更低的 sequence-id', ja: 'より小さい sequence-id', ko: '더 낮은 sequence-id' },
    'than streaming chunks — they genuinely precede the answer.': { 'zh-CN': '（比 streaming 分块）—— 它们确实先于答案出现。', 'zh-TW': '（比 streaming 區塊）—— 它們確實先於答案出現。', ja: '（streaming チャンクより小さい）— 実際に回答より前に来ます。', ko: '(streaming 청크보다 낮음) — 실제로 답변보다 먼저 옵니다.' },
    'caching': { 'zh-CN': '缓存', 'zh-TW': '快取', ja: 'のキャッシュ', ko: '캐싱' },
    'bites hard during dev — hard-reload after edits.': { 'zh-CN': '在开发期间很坑 —— 修改后请硬刷新。', 'zh-TW': '在開發期間很坑 —— 修改後請硬重新整理。', ja: 'は開発中に厄介です — 編集後はハード リロードしてください。', ko: '은 개발 중에 까다롭습니다 — 편집 후 강력 새로고침하세요.' },
    'on the connection polishes the latency loader UX.': { 'zh-CN': '加在连接上能优化延迟加载动画的体验。', 'zh-TW': '加在連線上能優化延遲載入動畫的體驗。', ja: 'を接続に設定すると、レイテンシ ローダーの UX が向上します。', ko: '를 연결에 설정하면 지연 로더 UX가 개선됩니다.' },
    'Budget time for the': { 'zh-CN': '把时间预算花在', 'zh-TW': '把時間預算花在', ja: '時間を確保すべきは', ko: '시간을 들여야 할 곳은' },
    'plumbing': { 'zh-CN': '底层管道', 'zh-TW': '底層管線', ja: '配管 (plumbing)', ko: '배관(plumbing)' },
    ', not the UI. The visible chat is easy; the activity reconciliation is where the work is.': { 'zh-CN': '上，而不是 UI。可见的聊天很简单；活动的协调才是真正的工作所在。', 'zh-TW': '上，而不是 UI。可見的聊天很簡單；活動的協調才是真正的工作所在。', ja: 'であって UI ではありません。見えるチャットは簡単で、アクティビティの調整こそが本当の作業です。', ko: '이며 UI가 아닙니다. 보이는 채팅은 쉽고, 활동 조정이 진짜 작업입니다.' },
    // --- Slides 12-15 (new-agent runtimes, GHCP /3p, takeaways) ---
    'Updated August 2026': { 'zh-CN': '更新于 2026 年 8 月', 'zh-TW': '更新於 2026 年 8 月', ja: '2026 年 8 月更新', ko: '2026년 8월 업데이트' },
    'Runtime Split': { 'zh-CN': '运行时分流', 'zh-TW': '執行階段分流', ja: 'ランタイムの分岐', ko: '런타임 분기' },
    'Choose the route by harness and authentication': { 'zh-CN': '按框架和身份验证选择路由', 'zh-TW': '依框架和驗證方式選擇路由', ja: 'ハーネスと認証方式でルートを選ぶ', ko: '하네스와 인증 방식에 따라 경로 선택' },
    '“New agent” is not one protocol. Standard-harness agents, no-auth agentic agents, and GitHub Copilot harness agents are served by different runtime routes.': {
      'zh-CN': '“新智能体”并非一种协议。标准框架智能体、无身份验证的智能体式智能体和 GitHub Copilot 框架智能体由不同的运行时路由提供服务。',
      'zh-TW': '「新代理程式」並非單一通訊協定。標準框架代理程式、無驗證的代理型代理程式，以及 GitHub Copilot 框架代理程式由不同的執行階段路由提供服務。',
      ja: '「新しいエージェント」は 1 つのプロトコルではありません。標準ハーネス、認証なしのエージェント型、GitHub Copilot ハーネスでは、それぞれ異なるランタイム ルートが使われます。',
      ko: '“새 에이전트”는 하나의 프로토콜이 아닙니다. 표준 하네스 에이전트, 인증 없는 에이전틱 에이전트, GitHub Copilot 하네스 에이전트는 서로 다른 런타임 경로에서 제공됩니다.'
    },
    '⚠️ Legacy published-bot DTE is the wrong GHCP route': { 'zh-CN': '⚠️ 旧版已发布 Bot DTE 不是 GHCP 的正确路由', 'zh-TW': '⚠️ 舊版已發佈 Bot DTE 不是 GHCP 的正確路由', ja: '⚠️ 従来の公開 Bot DTE は GHCP 用のルートではない', ko: '⚠️ 레거시 게시 봇 DTE는 GHCP 경로가 아님' },
    'Environment ID + schema alone makes the SDK call /copilotstudio/dataverse-backed/authenticated/bots/{schema} with the preview API version. A CLI/GHCP agent can fall into the classic “no related topic” behavior because this is not its agentic-loop controller.': {
      'zh-CN': '仅使用 Environment ID + schema 会使 SDK 通过预览版 API 调用 /copilotstudio/dataverse-backed/authenticated/bots/{schema}。由于这不是其智能体循环控制器，CLI/GHCP 智能体可能落入经典的“找不到相关主题”行为。',
      'zh-TW': '只使用 Environment ID + schema 會讓 SDK 透過預覽版 API 呼叫 /copilotstudio/dataverse-backed/authenticated/bots/{schema}。由於這不是其代理迴圈控制器，CLI/GHCP 代理程式可能落入傳統的「找不到相關主題」行為。',
      ja: 'Environment ID + schema だけを指定すると、SDK はプレビュー API で /copilotstudio/dataverse-backed/authenticated/bots/{schema} を呼び出します。これはエージェント ループのコントローラーではないため、CLI/GHCP エージェントは従来の「関連トピックがない」動作に入る場合があります。',
      ko: 'Environment ID + schema만 사용하면 SDK가 미리 보기 API 버전으로 /copilotstudio/dataverse-backed/authenticated/bots/{schema}를 호출합니다. 이 경로는 에이전틱 루프 컨트롤러가 아니므로 CLI/GHCP 에이전트가 기존 “관련 토픽 없음” 동작으로 빠질 수 있습니다.'
    },
    '✅ Agentic Runtime has two distinct integration families': { 'zh-CN': '✅ Agentic Runtime 有两类不同的集成方式', 'zh-TW': '✅ Agentic Runtime 有兩類不同的整合方式', ja: '✅ Agentic Runtime には 2 つの異なる統合方式がある', ko: '✅ Agentic Runtime에는 두 가지 통합 계열이 있음' },
    'No-auth agent: mint an agenticruntime/.../directline/token and use Direct Line. Integrated GHCP agent: send the delegated user token to agenticruntime/3p/.../bots/{schema} through CopilotStudioClient over SSE.': {
      'zh-CN': '无身份验证智能体：通过 agenticruntime/.../directline/token 铸造令牌并使用 Direct Line。集成身份验证的 GHCP 智能体：通过 CopilotStudioClient 和 SSE，将用户委托令牌发送到 agenticruntime/3p/.../bots/{schema}。',
      'zh-TW': '無驗證代理程式：透過 agenticruntime/.../directline/token 鑄造權杖並使用 Direct Line。整合驗證的 GHCP 代理程式：透過 CopilotStudioClient 和 SSE，將使用者委派權杖傳送到 agenticruntime/3p/.../bots/{schema}。',
      ja: '認証なしエージェント: agenticruntime/.../directline/token でトークンを発行し、Direct Line を使います。統合認証 GHCP エージェント: CopilotStudioClient と SSE を介して、委任ユーザー トークンを agenticruntime/3p/.../bots/{schema} に送ります。',
      ko: '인증 없는 에이전트: agenticruntime/.../directline/token에서 토큰을 발급해 Direct Line을 사용합니다. 통합 인증 GHCP 에이전트: CopilotStudioClient와 SSE를 통해 위임된 사용자 토큰을 agenticruntime/3p/.../bots/{schema}로 보냅니다.'
    },
    'The deciding input is the harness + authentication mode: no-auth can use agentic Direct Line; Microsoft-authenticated GHCP uses the authenticated /3p Direct-to-Engine route.': {
      'zh-CN': '决定性输入是框架 + 身份验证模式：无身份验证可使用 agentic Direct Line；Microsoft 身份验证的 GHCP 使用经过身份验证的 /3p Direct-to-Engine 路由。',
      'zh-TW': '決定性輸入是框架 + 驗證模式：無驗證可使用 agentic Direct Line；Microsoft 驗證的 GHCP 使用經過驗證的 /3p Direct-to-Engine 路由。',
      ja: '決め手はハーネス + 認証モードです。認証なしでは agentic Direct Line、Microsoft 認証 GHCP では認証付き /3p Direct-to-Engine ルートを使います。',
      ko: '결정 요소는 하네스 + 인증 모드입니다. 인증 없음은 agentic Direct Line을, Microsoft 인증 GHCP는 인증된 /3p Direct-to-Engine 경로를 사용합니다.'
    },
    'No-Auth Alternative': { 'zh-CN': '无身份验证替代方案', 'zh-TW': '無驗證替代方案', ja: '認証なしの代替経路', ko: '인증 없음 대안' },
    'The agenticruntime Direct Line bootstrap': { 'zh-CN': 'agenticruntime Direct Line 启动流程', 'zh-TW': 'agenticruntime Direct Line 啟動流程', ja: 'agenticruntime Direct Line のブートストラップ', ko: 'agenticruntime Direct Line 부트스트랩' },
    'This path was verified for a no-auth new agent. Direct Line does not carry the integrated Microsoft user context required by a GHCP employee agent; use the authenticated /3p route on the next slide.': {
      'zh-CN': '此路径已在无身份验证的新智能体上验证。Direct Line 不携带 GHCP 员工智能体所需的集成 Microsoft 用户上下文；请使用下一页中的经过身份验证的 /3p 路由。',
      'zh-TW': '此路徑已在無驗證的新代理程式上驗證。Direct Line 不會攜帶 GHCP 員工代理程式所需的整合 Microsoft 使用者內容；請使用下一頁中經過驗證的 /3p 路由。',
      ja: 'この経路は認証なしの新しいエージェントで検証済みです。Direct Line は GHCP 社内向けエージェントに必要な Microsoft ユーザー コンテキストを渡せないため、次のスライドの認証付き /3p ルートを使います。',
      ko: '이 경로는 인증 없는 새 에이전트에서 검증되었습니다. Direct Line은 GHCP 직원용 에이전트에 필요한 통합 Microsoft 사용자 컨텍스트를 전달하지 못하므로 다음 슬라이드의 인증된 /3p 경로를 사용하세요.'
    },
    'AUTH LIMIT — Verified only for a no-auth new agent. Direct Line does not carry the integrated Microsoft user context required by a GHCP employee agent; use authenticated /3p instead.': {
      'zh-CN': '身份验证限制 — 仅在无身份验证的新智能体上验证。Direct Line 不携带 GHCP 员工智能体所需的集成 Microsoft 用户上下文；请改用经过身份验证的 /3p。',
      'zh-TW': '驗證限制 — 僅在無驗證的新代理程式上驗證。Direct Line 不會攜帶 GHCP 員工代理程式所需的整合 Microsoft 使用者內容；請改用經過驗證的 /3p。',
      ja: '認証上の制限 — 認証なしの新しいエージェントでのみ検証済みです。Direct Line は GHCP 社内向けエージェントに必要な Microsoft ユーザー コンテキストを渡せないため、認証付き /3p を使ってください。',
      ko: '인증 제한 — 인증 없는 새 에이전트에서만 검증되었습니다. Direct Line은 GHCP 직원용 에이전트에 필요한 통합 Microsoft 사용자 컨텍스트를 전달하지 못하므로 인증된 /3p를 사용하세요.'
    },
    'New Agent Experience · Live Finding': { 'zh-CN': '新智能体体验 · 实测发现', 'zh-TW': '新代理程式體驗 · 實測發現', ja: '新しいエージェント エクスペリエンス · 実測結果', ko: '새 에이전트 환경 · 실측 결과' },
    'Authenticated GHCP streaming works through /3p': { 'zh-CN': '经过身份验证的 GHCP 可通过 /3p 实现流式响应', 'zh-TW': '經過驗證的 GHCP 可透過 /3p 實現串流', ja: '認証付き GHCP ストリーミングは /3p で動作する', ko: '인증된 GHCP 스트리밍은 /3p를 통해 동작' },
    'Authenticated GHCP streaming through /3p (experimental)': { 'zh-CN': '经过身份验证的 GHCP 通过 /3p 实现流式响应（实验性）', 'zh-TW': '經過驗證的 GHCP 透過 /3p 實現串流（實驗性）', ja: '認証付き GHCP ストリーミングを /3p で実現（試験的）', ko: '인증된 GHCP 스트리밍을 /3p로 구현(실험적)' },
    'Live-verified on August 5, 2026: a published GitHub Copilot harness agent with Microsoft authentication returned its real progressive response when the client targeted the Agentic Runtime 3P controller.': {
      'zh-CN': '2026 年 8 月 5 日实测验证：当客户端指向 Agentic Runtime 3P 控制器时，一个已发布且使用 Microsoft 身份验证的 GitHub Copilot 框架智能体返回了真实的渐进式响应。',
      'zh-TW': '2026 年 8 月 5 日實測驗證：當用戶端指向 Agentic Runtime 3P 控制器時，一個已發佈且使用 Microsoft 驗證的 GitHub Copilot 框架代理程式傳回了真實的漸進式回應。',
      ja: '2026 年 8 月 5 日に実環境で検証済みです。クライアントが Agentic Runtime 3P コントローラーを指定すると、Microsoft 認証を使う公開済み GitHub Copilot ハーネス エージェントから実際の段階的応答が返りました。',
      ko: '2026년 8월 5일 실환경 검증: 클라이언트가 Agentic Runtime 3P 컨트롤러를 대상으로 하자 Microsoft 인증을 사용하는 게시된 GitHub Copilot 하네스 에이전트가 실제 점진적 응답을 반환했습니다.'
    },
    'Live-verified August 5, 2026 against a published, Microsoft-authenticated GHCP agent. The /3p controller streamed the real progressive response; Microsoft Learn still says new-experience client-library support is not official.': {
      'zh-CN': '2026 年 8 月 5 日已在一个发布且使用 Microsoft 身份验证的 GHCP 智能体上实测验证。/3p 控制器传回了真实的渐进式响应；Microsoft Learn 仍说明新体验客户端库支持尚未正式发布。',
      'zh-TW': '2026 年 8 月 5 日已在一個發佈且使用 Microsoft 驗證的 GHCP 代理程式上實測驗證。/3p 控制器傳回了真實的漸進式回應；Microsoft Learn 仍說明新體驗用戶端程式庫支援尚未正式發佈。',
      ja: '2026 年 8 月 5 日、公開済みで Microsoft 認証を使う GHCP エージェントに対して実環境で検証しました。/3p コントローラーから実際の段階的応答がストリーミングされましたが、Microsoft Learn では新しいエクスペリエンスのクライアント ライブラリ サポートはまだ正式ではないとされています。',
      ko: '2026년 8월 5일 게시되고 Microsoft 인증을 사용하는 GHCP 에이전트에서 실환경 검증했습니다. /3p 컨트롤러가 실제 점진적 응답을 스트리밍했지만 Microsoft Learn은 새 환경 클라이언트 라이브러리 지원이 아직 공식적이지 않다고 명시합니다.'
    },
    '1 · identity': { 'zh-CN': '1 · 身份', 'zh-TW': '1 · 身分', ja: '1 · ID', ko: '1 · ID' },
    'MSAL acquires the signed-in user\'s delegated Power Platform token.': { 'zh-CN': 'MSAL 获取已登录用户的 Power Platform 委托令牌。', 'zh-TW': 'MSAL 取得已登入使用者的 Power Platform 委派權杖。', ja: 'MSAL がサインイン ユーザーの委任 Power Platform トークンを取得します。', ko: 'MSAL이 로그인한 사용자의 위임된 Power Platform 토큰을 획득합니다.' },
    '2 · route': { 'zh-CN': '2 · 路由', 'zh-TW': '2 · 路由', ja: '2 · ルート', ko: '2 · 경로' },
    'Build the environment host and supply the GHCP base URL as directConnectUrl.': { 'zh-CN': '构建环境主机，并将 GHCP 基础 URL 作为 directConnectUrl 提供。', 'zh-TW': '建立環境主機，並將 GHCP 基礎 URL 作為 directConnectUrl 提供。', ja: '環境ホストを組み立て、GHCP ベース URL を directConnectUrl として渡します。', ko: '환경 호스트를 구성하고 GHCP 기본 URL을 directConnectUrl로 제공합니다.' },
    '3 · sidecar': { 'zh-CN': '3 · 边车', 'zh-TW': '3 · Sidecar', ja: '3 · サイドカー', ko: '3 · 사이드카' },
    'Node validates the host/path, preflights once, then keeps the SDK conversation alive.': { 'zh-CN': 'Node 验证主机/路径，执行一次预检，然后保持 SDK 对话存活。', 'zh-TW': 'Node 驗證主機/路徑，執行一次預檢，然後保持 SDK 交談存活。', ja: 'Node がホスト/パスを検証し、1 回だけ事前確認した後、SDK の会話を維持します。', ko: 'Node가 호스트/경로를 검증하고 한 번 사전 점검한 뒤 SDK 대화를 유지합니다.' },
    '4 · render': { 'zh-CN': '4 · 呈现', 'zh-TW': '4 · 呈現', ja: '4 · 描画', ko: '4 · 렌더링' },
    'The normalization tap coalesces cumulative chunks into one growing Web Chat bubble.': { 'zh-CN': '规范化 tap 将累积式分块合并为一个不断增长的 Web Chat 气泡。', 'zh-TW': '正規化 tap 將累積式區塊合併為一個持續增長的 Web Chat 泡泡。', ja: '正規化 tap が累積チャンクを 1 つの成長する Web Chat バブルにまとめます。', ko: '정규화 tap이 누적 청크를 하나의 커지는 Web Chat 버블로 병합합니다.' },
    '✅ What arrived': { 'zh-CN': '✅ 实际收到的内容', 'zh-TW': '✅ 實際收到的內容', ja: '✅ 実際に届いたもの', ko: '✅ 실제로 도착한 내용' },
    'Observed stream': { 'zh-CN': '实测流内容', 'zh-TW': '實測串流內容', ja: '観測したストリーム', ko: '관측된 스트림' },
    'Cumulative typing updates, informative tool/status cues, thought entities, the final Markdown message, and generated-file attachments.': { 'zh-CN': '累积式 typing 更新、informative 工具/状态提示、thought 实体、最终 Markdown 消息，以及生成的文件附件。', 'zh-TW': '累積式 typing 更新、informative 工具/狀態提示、thought 實體、最終 Markdown 訊息，以及產生的檔案附件。', ja: '累積 typing 更新、informative のツール/状態通知、thought エンティティ、最終 Markdown メッセージ、生成ファイルの添付が届きます。', ko: '누적 typing 업데이트, informative 도구/상태 신호, thought 엔터티, 최종 Markdown 메시지 및 생성된 파일 첨부가 도착합니다.' },
    'Cumulative typing updates, informative tool/status cues, thought entities, final Markdown, and generated-file attachments.': { 'zh-CN': '累积式 typing 更新、informative 工具/状态提示、thought 实体、最终 Markdown，以及生成的文件附件。', 'zh-TW': '累積式 typing 更新、informative 工具/狀態提示、thought 實體、最終 Markdown，以及產生的檔案附件。', ja: '累積 typing 更新、informative のツール/状態通知、thought エンティティ、最終 Markdown、生成ファイルの添付。', ko: '누적 typing 업데이트, informative 도구/상태 신호, thought 엔터티, 최종 Markdown 및 생성된 파일 첨부.' },
    'Why the route matters': { 'zh-CN': '为何路由至关重要', 'zh-TW': '為何路由至關重要', ja: 'ルートが重要な理由', ko: '경로가 중요한 이유' },
    'Routing reason': { 'zh-CN': '路由原因', 'zh-TW': '路由原因', ja: 'ルーティングの理由', ko: '라우팅 이유' },
    'Setting directConnectUrl bypasses the legacy PublishedBotStrategy and keeps api-version=1 on every conversation turn.': { 'zh-CN': '设置 directConnectUrl 会绕过旧版 PublishedBotStrategy，并在每个对话轮次中保留 api-version=1。', 'zh-TW': '設定 directConnectUrl 會略過舊版 PublishedBotStrategy，並在每個交談回合中保留 api-version=1。', ja: 'directConnectUrl を設定すると従来の PublishedBotStrategy を迂回し、すべての会話ターンで api-version=1 を維持します。', ko: 'directConnectUrl을 설정하면 레거시 PublishedBotStrategy를 우회하고 모든 대화 턴에서 api-version=1을 유지합니다.' },
    'directConnectUrl bypasses legacy PublishedBotStrategy and keeps api-version=1 on every turn.': { 'zh-CN': 'directConnectUrl 绕过旧版 PublishedBotStrategy，并在每个轮次中保留 api-version=1。', 'zh-TW': 'directConnectUrl 略過舊版 PublishedBotStrategy，並在每個回合中保留 api-version=1。', ja: 'directConnectUrl は従来の PublishedBotStrategy を迂回し、各ターンで api-version=1 を維持します。', ko: 'directConnectUrl은 레거시 PublishedBotStrategy를 우회하고 모든 턴에서 api-version=1을 유지합니다.' },
    'This is a Microsoft-source-backed, live-proven developer path. Microsoft Learn still says new-experience agents are not officially supported by the client library, so treat /3p as experimental until production support is published.': {
      'zh-CN': '这是一个有 Microsoft 源代码依据并经过实测验证的开发者路径。Microsoft Learn 仍说明客户端库尚未正式支持新体验智能体，因此在发布生产支持之前，请将 /3p 视为实验性方案。',
      'zh-TW': '這是一個有 Microsoft 原始碼依據並經過實測驗證的開發者路徑。Microsoft Learn 仍說明用戶端程式庫尚未正式支援新體驗代理程式，因此在發佈生產支援之前，請將 /3p 視為實驗性方案。',
      ja: 'これは Microsoft のソースに基づき、実環境で動作確認した開発者向け経路です。ただし Microsoft Learn は、新しいエクスペリエンスのエージェントがクライアント ライブラリでまだ正式サポートされていないとしています。本番サポートが公開されるまでは /3p を試験的な経路として扱ってください。',
      ko: '이 경로는 Microsoft 소스에 근거하고 실환경에서 검증된 개발자 경로입니다. Microsoft Learn은 새 환경 에이전트가 클라이언트 라이브러리에서 아직 공식 지원되지 않는다고 명시하므로 프로덕션 지원이 게시될 때까지 /3p를 실험적으로 취급하세요.'
    },
    'EXPERIMENTAL SUPPORT BOUNDARY — Use this Microsoft-source-backed developer path for testing until Microsoft publishes production support for new-experience clients.': {
      'zh-CN': '实验性支持边界 — 在 Microsoft 发布新体验客户端的生产支持之前，请仅将这个有 Microsoft 源代码依据的开发者路径用于测试。',
      'zh-TW': '實驗性支援界線 — 在 Microsoft 發佈新體驗用戶端的生產支援之前，請僅將這個有 Microsoft 原始碼依據的開發者路徑用於測試。',
      ja: '試験的サポート境界 — Microsoft が新しいエクスペリエンスのクライアント向け本番サポートを公開するまでは、Microsoft のソースに基づくこの開発者経路をテスト用途に限定してください。',
      ko: '실험적 지원 경계 — Microsoft가 새 환경 클라이언트의 프로덕션 지원을 게시할 때까지 Microsoft 소스에 근거한 이 개발자 경로는 테스트에만 사용하세요.'
    },
    'Use this Microsoft-source-backed developer path for testing until Microsoft publishes production support for new-experience clients.': { 'zh-CN': '在 Microsoft 发布新体验客户端的生产支持之前，请仅将这个有 Microsoft 源代码依据的开发者路径用于测试。', 'zh-TW': '在 Microsoft 發佈新體驗用戶端的生產支援之前，請僅將這個有 Microsoft 原始碼依據的開發者路徑用於測試。', ja: 'Microsoft が新しいエクスペリエンスのクライアント向け本番サポートを公開するまでは、Microsoft のソースに基づくこの開発者経路をテスト用途に限定してください。', ko: 'Microsoft가 새 환경 클라이언트의 프로덕션 지원을 게시할 때까지 Microsoft 소스에 근거한 이 개발자 경로는 테스트에만 사용하세요.' },
    'If you remember four things': { 'zh-CN': '请记住四件事', 'zh-TW': '請記住四件事', ja: '覚えておくべき 4 つのこと', ko: '기억해야 할 네 가지' },
    'For an integrated GHCP agent, use the authenticated agenticruntime/3p Direct-to-Engine route — not legacy DTE or Direct Line.': { 'zh-CN': '对于集成身份验证的 GHCP 智能体，请使用经过身份验证的 agenticruntime/3p Direct-to-Engine 路由，而不是旧版 DTE 或 Direct Line。', 'zh-TW': '對於整合驗證的 GHCP 代理程式，請使用經過驗證的 agenticruntime/3p Direct-to-Engine 路由，而不是舊版 DTE 或 Direct Line。', ja: '統合認証 GHCP エージェントでは、従来の DTE や Direct Line ではなく、認証付き agenticruntime/3p Direct-to-Engine ルートを使います。', ko: '통합 인증 GHCP 에이전트에는 레거시 DTE나 Direct Line이 아니라 인증된 agenticruntime/3p Direct-to-Engine 경로를 사용합니다.' },
    'Integrated GHCP: use authenticated agenticruntime/3p DTE — never legacy DTE or Direct Line.': { 'zh-CN': '集成身份验证的 GHCP：使用经过身份验证的 agenticruntime/3p DTE，绝不要使用旧版 DTE 或 Direct Line。', 'zh-TW': '整合驗證的 GHCP：使用經過驗證的 agenticruntime/3p DTE，絕不要使用舊版 DTE 或 Direct Line。', ja: '統合認証 GHCP: 認証付き agenticruntime/3p DTE を使い、従来の DTE や Direct Line は使いません。', ko: '통합 인증 GHCP: 인증된 agenticruntime/3p DTE를 사용하고 레거시 DTE나 Direct Line은 사용하지 않습니다.' },
    'Integrated GHCP (experimental): test with authenticated /3p DTE; avoid legacy DTE and Direct Line.': { 'zh-CN': '集成身份验证的 GHCP（实验性）：使用经过身份验证的 /3p DTE 进行测试；避免使用旧版 DTE 和 Direct Line。', 'zh-TW': '整合驗證的 GHCP（實驗性）：使用經過驗證的 /3p DTE 進行測試；避免使用舊版 DTE 和 Direct Line。', ja: '統合認証 GHCP（試験的）: 認証付き /3p DTE でテストし、従来の DTE と Direct Line は避けます。', ko: '통합 인증 GHCP(실험적): 인증된 /3p DTE로 테스트하고 레거시 DTE와 Direct Line은 피하세요.' },
    '11 · RUNTIME SPLIT': { 'zh-CN': '11 · 运行时分流', 'zh-TW': '11 · 執行階段分流', ja: '11 · ランタイムの分岐', ko: '11 · 런타임 분기' },
    '12 · NO-AUTH ALTERNATIVE': { 'zh-CN': '12 · 无身份验证替代方案', 'zh-TW': '12 · 無驗證替代方案', ja: '12 · 認証なしの代替経路', ko: '12 · 인증 없음 대안' },
    '13 · NEW AGENT EXPERIENCE': { 'zh-CN': '13 · 新智能体体验', 'zh-TW': '13 · 新代理程式體驗', ja: '13 · 新しいエージェント エクスペリエンス', ko: '13 · 새 에이전트 환경' },
    '14 · TAKEAWAYS': { 'zh-CN': '14 · 要点', 'zh-TW': '14 · 重點', ja: '14 · 要点', ko: '14 · 핵심 요점' },
    '15 · COMMUNITY SHARE': { 'zh-CN': '15 · 社区分享', 'zh-TW': '15 · 社區分享', ja: '15 · コミュニティ共有', ko: '15 · 커뮤니티 공유' },
    // --- Legacy takeaways fragments ---
    'Both': { 'zh-CN': '两者：', 'zh-TW': '兩者：', ja: '両方:', ko: '둘 다:' },
    'and': { 'zh-CN': '和', 'zh-TW': '和', ja: 'と', ko: '및' },
    'stream — DtE is native; DL needs': { 'zh-CN': '都支持流式 —— DtE 是原生的；DL 需要', 'zh-TW': '都支援串流 —— DtE 是原生的；DL 需要', ja: 'がストリーミング — DtE はネイティブ。DL は次が必要:', ko: '스트리밍 — DtE는 기본; DL은 다음이 필요:' },
    'Web Chat groups bubbles by activity': { 'zh-CN': 'Web Chat 按活动', 'zh-TW': 'Web Chat 依活動', ja: 'Web Chat はアクティビティ', ko: 'Web Chat은 활동' },
    '; force': { 'zh-CN': ' 分组气泡；强制', 'zh-TW': ' 分組泡泡；強制', ja: ' でバブルをグループ化。強制:', ko: '으로 버블을 그룹화; 강제:' },
    'for one growing bubble.': { 'zh-CN': '以获得一个不断增长的气泡。', 'zh-TW': '以獲得一個不斷增長的泡泡。', ja: 'して 1 つの成長するバブルにします。', ko: '하여 하나의 커지는 버블을 만듭니다.' },
    'Do all reconciliation in a': { 'zh-CN': '在', 'zh-TW': '在', ja: 'すべての調整を', ko: '모든 조정을' },
    'normalization tap': { 'zh-CN': '规范化 tap', 'zh-TW': '正規化 tap', ja: '正規化 tap', ko: '정規化 tap' },
    '— single subscription, no library forks.': { 'zh-CN': '中完成所有协调 —— 单一订阅，不分叉任何库。', 'zh-TW': '中完成所有協調 —— 單一訂閱，不分支任何程式庫。', ja: 'で行います — 単一サブスクリプション、ライブラリのフォークなし。', ko: '에서 수행합니다 — 단일 구독, 라이브러리 포크 없음.' },
    // --- Slide 1 (Title - Maker info) ---
    'Prepared by: Michael Jiang': { 'zh-CN': '编制者：Michael Jiang', 'zh-TW': '編製者：Michael Jiang', ja: '作成者: Michael Jiang', ko: '작성자: Michael Jiang' },
    'michael.jiang@microsoft.com': { 'zh-CN': 'michael.jiang@microsoft.com', 'zh-TW': 'michael.jiang@microsoft.com', ja: 'michael.jiang@microsoft.com', ko: 'michael.jiang@microsoft.com' },
    'Microsoft AI Business Process GBB Asia': { 'zh-CN': 'Microsoft AI Business Process GBB 亚洲地区', 'zh-TW': 'Microsoft AI Business Process GBB 亞洲地區', ja: 'Microsoft AI Business Process GBB アジア地域', ko: 'Microsoft AI Business Process GBB 아시아 지역' },
    // --- Slide 13 (Community Sharing) ---
    'Community Share': { 'zh-CN': '社区分享', 'zh-TW': '社區分享', ja: 'コミュニティ共有', ko: '커뮤니티 공유' },
    'Discover more and test with your own agent': { 'zh-CN': '探索更多并使用你自己的智能体进行测试', 'zh-TW': '探索更多並使用你自己的代理程式進行測試', ja: 'さらに探索して、独自のエージェントでテストします', ko: '더 많이 탐색하고 자신의 에이전트로 테스트' },
    'We shared this streaming reference publicly so teams can quickly reproduce token-by-token UX in both Direct Line and Direct-to-Engine, then validate behavior with the same inspector patterns.': { 'zh-CN': '我们公开共享了这个流式响应参考，以便团队能在 Direct Line 和 Direct-to-Engine 中快速复现逐 token 的用户体验，然后使用相同的检查器模式验证行为。', 'zh-TW': '我們公開共享了這個串流回應參考，以便團隊能在 Direct Line 和 Direct-to-Engine 中快速複現逐 token 的使用者體驗，然後使用相同的檢查器模式驗證行為。', ja: 'このストリーミング リファレンスを公開して、チームが Direct Line と Direct-to-Engine の両方でトークン単位の UX をすばやく再現し、同じインスペクター パターンで動作を検証できるようにしました。', ko: '이 스트리밍 참조를 공개하여 팀이 Direct Line과 Direct-to-Engine에서 토큰 단위 UX를 빠르게 재현하고 동일한 검사기 패턴으로 동작을 검증할 수 있도록 했습니다.' },
    'We shared this streaming reference publicly so teams can reproduce progressive-response UX, then validate the actual wire behavior with the same inspector patterns.': { 'zh-CN': '我们公开共享这个流式响应参考，让团队能够复现渐进式响应体验，并使用相同的检查器模式验证实际线协议行为。', 'zh-TW': '我們公開共享這個串流回應參考，讓團隊能夠複現漸進式回應體驗，並使用相同的檢查器模式驗證實際線路行為。', ja: 'このストリーミング リファレンスを公開し、チームが段階的な応答 UX を再現して、同じインスペクター パターンで実際のワイヤ動作を検証できるようにしました。', ko: '이 스트리밍 참조를 공개하여 팀이 점진적 응답 UX를 재현하고 동일한 검사기 패턴으로 실제 와이어 동작을 검증할 수 있도록 했습니다.' },
    'Repository snapshot': { 'zh-CN': '存储库快照', 'zh-TW': '存放庫快照', ja: 'リポジトリ スナップショット', ko: '저장소 스냅샷' },
    'Maker: Michael Jiang (michael.jiang@microsoft.com), Microsoft AI Business Process GBB Asia': { 'zh-CN': '编制者：Michael Jiang (michael.jiang@microsoft.com)，Microsoft AI Business Process GBB 亚洲地区', 'zh-TW': '編製者：Michael Jiang (michael.jiang@microsoft.com)，Microsoft AI Business Process GBB 亞洲地區', ja: '作成者: Michael Jiang (michael.jiang@microsoft.com)、Microsoft AI Business Process GBB アジア地域', ko: '작성자: Michael Jiang(michael.jiang@microsoft.com), Microsoft AI Business Process GBB 아시아 지역' },
    'Shared repo home with latest commits, README, docs, and deployment status.': { 'zh-CN': '共享的存储库主页，包含最新提交、README、文档和部署状态。', 'zh-TW': '共享的存放庫主頁，包含最新提交、README、文檔和部署狀態。', ja: '最新のコミット、README、ドキュメント、デプロイ状態を含む共有リポジトリホーム。', ko: '최신 커밋, README, 문서 및 배포 상태가 포함된 공유 저장소 홈.' },
    'Where to discover more': { 'zh-CN': '在哪里了解更多', 'zh-TW': '在哪裡了解更多', ja: 'さらに詳しくはどこで', ko: '더 많이 알아볼 곳' },
    'GitHub repository:': { 'zh-CN': 'GitHub 存储库：', 'zh-TW': 'GitHub 存放庫：', ja: 'GitHub リポジトリ:', ko: 'GitHub 저장소:' },
    'github.com/jzh24516/copilot-streaming-chat-playground': { 'zh-CN': 'github.com/jzh24516/copilot-streaming-chat-playground', 'zh-TW': 'github.com/jzh24516/copilot-streaming-chat-playground', ja: 'github.com/jzh24516/copilot-streaming-chat-playground', ko: 'github.com/jzh24516/copilot-streaming-chat-playground' },
    'Streaming tech note (HTML):': { 'zh-CN': '流式响应技术说明 (HTML)：', 'zh-TW': '串流回應技術說明 (HTML)：', ja: 'ストリーミング技術ノート (HTML):', ko: '스트리밍 기술 노트(HTML):' },
    '/docs/streaming-tech-note.html': { 'zh-CN': '/docs/streaming-tech-note.html', 'zh-TW': '/docs/streaming-tech-note.html', ja: '/docs/streaming-tech-note.html', ko: '/docs/streaming-tech-note.html' },
    'Multilingual playground:': { 'zh-CN': '多语言体验场：', 'zh-TW': '多語言體驗場：', ja: '多言語プレイグラウンド:', ko: '다국어 플레이그라운드:' },
    'Use the language switcher and connect your own agent to test Direct Line vs Direct-to-Engine behavior.': { 'zh-CN': '使用语言切换器并连接自己的智能体来测试 Direct Line 与 Direct-to-Engine 的行为。', 'zh-TW': '使用語言切換器並連接自己的代理程式來測試 Direct Line 與 Direct-to-Engine 的行為。', ja: '言語スイッチャーを使用して、独自のエージェントを接続し、Direct Line と Direct-to-Engine の動作をテストします。', ko: '언어 전환기를 사용하여 자신의 에이전트를 연결하고 Direct Line과 Direct-to-Engine 동작을 테스트합니다.' },
    'Start from the repo, run locally, and use this deck + inspector to shorten streaming rollout time for your own Copilot Studio projects.': { 'zh-CN': '从存储库开始，在本地运行，并使用此演示文稿 + 检查器来缩短 Copilot Studio 项目的流式响应推出时间。', 'zh-TW': '從存放庫開始，在本機執行，並使用此簡報 + 檢查器來縮短 Copilot Studio 專案的串流回應推出時間。', ja: 'リポジトリから開始し、ローカルで実行し、このデッキ + インスペクターを使用して、Copilot Studio プロジェクトのストリーミング ロールアウト時間を短縮します。', ko: '저장소에서 시작하여 로컬로 실행하고 이 데크 + 검사기를 사용하여 Copilot Studio 프로젝트의 스트리밍 롤아웃 시간을 단축합니다.' }
  };

  function normalizeLang(lang) {
    if (languages[lang]) return lang;
    if (/^zh[-_]?tw$/i.test(lang) || /^zh[-_]?hant/i.test(lang)) return 'zh-TW';
    if (/^zh/i.test(lang)) return 'zh-CN';
    if (/^ja/i.test(lang)) return 'ja';
    if (/^ko/i.test(lang)) return 'ko';
    return 'en';
  }

  function getInitialLang() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('lang');
    if (fromUrl) return normalizeLang(fromUrl);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return normalizeLang(saved);
    } catch {
      /* ignore */
    }
    return 'en';
  }

  function setStoredLang(lang) {
    const next = normalizeLang(lang);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    return next;
  }

  function translate(source, lang, vars) {
    const nextLang = normalizeLang(lang || getInitialLang());
    const normalized = typeof source === 'string' ? source.replace(/\s+/g, ' ').trim() : source;
    let value =
      nextLang === 'en'
        ? source
        : text[source]?.[nextLang] || text[normalized]?.[nextLang] || source;
    if (vars) {
      value = value.replace(/\{(\w+)\}/g, (match, key) =>
        Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
      );
    }
    return value;
  }

  function translateTextNode(node, lang) {
    if (!node.__i18nSource) node.__i18nSource = node.nodeValue;
    const source = node.__i18nSource;
    const trimmed = source.trim();
    if (!trimmed) return;
    const leading = source.match(/^\s*/)[0];
    const trailing = source.match(/\s*$/)[0];
    node.nodeValue = leading + translate(trimmed, lang) + trailing;
  }

  function shouldSkipTextNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    return Boolean(parent.closest('script, style, noscript'));
  }

  function applyText(root, lang) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return shouldSkipTextNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => translateTextNode(node, lang));
  }

  function translateAttribute(el, attr, lang) {
    const key = `i18n${attr.replace(/(^|-)(\w)/g, (_, _dash, c) => c.toUpperCase())}Source`;
    if (!el.dataset[key]) el.dataset[key] = el.getAttribute(attr) || '';
    const source = el.dataset[key];
    if (source) el.setAttribute(attr, translate(source, lang));
  }

  function applyAttributes(root, lang) {
    const selector = '[placeholder], [title], [aria-label]';
    root.querySelectorAll(selector).forEach((el) => {
      ['placeholder', 'title', 'aria-label'].forEach((attr) => {
        if (el.hasAttribute(attr)) translateAttribute(el, attr, lang);
      });
    });
  }

  function apply(root, lang) {
    const next = normalizeLang(lang || getInitialLang());
    document.documentElement.lang = languages[next].htmlLang;
    applyText(root || document.body, next);
    applyAttributes(root || document.body, next);
  }

  function populateSelect(select, lang) {
    if (!select) return;
    const current = normalizeLang(lang || getInitialLang());
    select.innerHTML = '';
    Object.entries(languages).forEach(([value, meta]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = translate(meta.label, current);
      select.appendChild(option);
    });
    select.value = current;
  }

  function localizePptxText(content, lang) {
    if (typeof content === 'string') {
      const source = content.trim();
      const translated = translate(source, lang);
      return translated === source ? content : content.split(source).join(translated);
    }
    if (Array.isArray(content)) {
      return content.map((item) => ({
        ...item,
        text: localizePptxText(item.text, lang)
      }));
    }
    return content;
  }

  function localizePptx(pptx, lang) {
    if (!pptx || pptx.__i18nLocalized) return;
    const addSlide = pptx.addSlide.bind(pptx);
    pptx.addSlide = (...args) => {
      const slide = addSlide(...args);
      const addText = slide.addText.bind(slide);
      slide.addText = (content, options) => addText(localizePptxText(content, lang), options);
      return slide;
    };
    pptx.__i18nLocalized = true;
  }

  window.StreamingI18n = {
    languages,
    normalizeLang,
    getInitialLang,
    setStoredLang,
    translate,
    apply,
    populateSelect,
    localizePptx,
    webChatLocale(lang) {
      return languages[normalizeLang(lang)].webChatLocale;
    }
  };
})();