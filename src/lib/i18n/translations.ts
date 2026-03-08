/**
 * Static UI translations (nav, buttons, labels).
 * These never need an API call — they're bundled at build time.
 * Dynamic content (descriptions, alerts, etc.) is translated via the API.
 *
 * Keys: English reference. Add translations under each lang code.
 */
import type { LangCode } from "./locales";

export type TranslationKey =
  // Nav sections
  | "nav.overview"
  | "nav.fleet"
  | "nav.ai"
  | "nav.account"
  // Nav items
  | "nav.dashboard"
  | "nav.plants"
  | "nav.inverters"
  | "nav.analytics"
  | "nav.grid"
  | "nav.maintenance"
  | "nav.aiAdvisor"
  | "nav.chat"
  | "nav.anomalies"
  | "nav.forecast"
  | "nav.carbon"
  | "nav.settings"
  // Header
  | "header.title"
  | "header.subtitle"
  | "header.allSystems"
  | "header.signIn"
  | "header.signOut"
  | "header.language"
  // Common
  | "common.loading"
  | "common.error"
  | "common.retry"
  | "common.save"
  | "common.cancel"
  | "common.delete"
  | "common.edit"
  | "common.add"
  | "common.search"
  | "common.status"
  | "common.actions"
  | "common.healthy"
  | "common.warning"
  | "common.critical"
  | "common.new"
  | "common.live"
  // Inverters page
  | "inverters.title"
  | "inverters.subtitle"
  | "inverters.addInverter"
  | "inverters.total"
  | "inverters.noResults"
  | "inverters.allInverters"
  | "inverters.deleteConfirm"
  // Weather
  | "weather.title"
  | "weather.temperature"
  | "weather.wind"
  | "weather.weathercode"
  | "weather.fetching"
  | "weather.unavailable"
  // Dashboard
  | "dash.systemOverview"
  | "dash.systemOverviewSub"
  | "dash.totalInverters"
  | "dash.acrossSites"
  | "dash.healthy"
  | "dash.warnings"
  | "dash.requireAttention"
  | "dash.criticalRisk"
  | "dash.immediateAction"
  | "dash.avgPerformance"
  | "dash.fleetWide"
  | "dash.totalOutput"
  | "dash.combinedGen"
  | "dash.systemUptime"
  | "dash.last30Days"
  | "dash.aiPredictions"
  | "dash.failuresPredicted"
  | "dash.perfTrend"
  | "dash.perfTrendSub"
  | "dash.inverterFleetStatus"
  | "dash.units"
  | "dash.genAiTitle"
  | "dash.genAiSub"
  | "dash.insights"
  | "dash.analysis"
  | "dash.recommendedActions"
  | "dash.confidence"
  // Table columns
  | "table.inverter"
  | "table.status"
  | "table.performance"
  | "table.temp"
  | "table.output"
  | "table.risk"
  | "table.updated"
  // Page titles
  | "page.analytics"
  | "page.analyticsSub"
  | "page.aiAdvisor"
  | "page.aiAdvisorSub"
  | "page.anomalies"
  | "page.anomaliesSub"
  | "page.forecast"
  | "page.forecastSub"
  | "page.carbon"
  | "page.carbonSub"
  | "page.maintenance"
  | "page.maintenanceSub"
  | "page.security"
  | "page.securitySub"
  | "page.settings"
  | "page.settingsSub"
  // Analytics
  | "analytics.genVsConsume"
  | "analytics.monthlyYoY"
  | "analytics.inverterRanking"
  | "analytics.degradation"
  | "analytics.energyMix"
  | "analytics.generated"
  | "analytics.consumed"
  | "analytics.exported"
  | "analytics.thisYear"
  | "analytics.lastYear"
  | "analytics.target";

export type Translations = Partial<Record<TranslationKey, string>>;

const en: Translations = {
  "nav.overview": "OVERVIEW",
  "nav.fleet": "FLEET MANAGEMENT",
  "nav.ai": "AI FEATURES",
  "nav.account": "ACCOUNT",
  "nav.dashboard": "Dashboard",
  "nav.plants": "Solar Plants",
  "nav.inverters": "Inverter Fleet",
  "nav.analytics": "Analytics",
  "nav.grid": "DISCOM / Grid",
  "nav.maintenance": "Maintenance",
  "nav.aiAdvisor": "AI Advisor",
  "nav.chat": "AI Chat",
  "nav.anomalies": "Anomaly Detect",
  "nav.forecast": "Solar Forecast",
  "nav.carbon": "Carbon Impact",
  "nav.settings": "Settings",
  "header.title": "Operations Dashboard",
  "header.subtitle": "Real-time inverter fleet intelligence",
  "header.allSystems": "All systems operational",
  "header.signIn": "Sign in",
  "header.signOut": "Sign out",
  "header.language": "Language",
  "common.loading": "Loading…",
  "common.error": "Error",
  "common.retry": "Retry",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.add": "Add",
  "common.search": "Search…",
  "common.status": "Status",
  "common.actions": "Actions",
  "common.healthy": "healthy",
  "common.warning": "warning",
  "common.critical": "critical",
  "common.new": "NEW",
  "common.live": "LIVE",
  "inverters.title": "Inverter Fleet",
  "inverters.subtitle": "Manage, configure, and monitor all inverters in your solar plant.",
  "inverters.addInverter": "Add Inverter",
  "inverters.total": "Total Inverters",
  "inverters.noResults": "No inverters found.",
  "inverters.allInverters": "All Inverters",
  "inverters.deleteConfirm": "This cannot be undone.",
  "weather.title": "Weather",
  "weather.temperature": "Temperature",
  "weather.wind": "Wind",
  "weather.weathercode": "Condition",
  "weather.fetching": "Fetching weather…",
  "weather.unavailable": "Weather unavailable",
};

const hi: Translations = {
  "nav.overview": "अवलोकन",
  "nav.fleet": "फ्लीट प्रबंधन",
  "nav.ai": "AI सुविधाएं",
  "nav.account": "खाता",
  "nav.dashboard": "डैशबोर्ड",
  "nav.plants": "सौर संयंत्र",
  "nav.inverters": "इन्वर्टर फ्लीट",
  "nav.analytics": "विश्लेषण",
  "nav.grid": "डिस्कॉम / ग्रिड",
  "nav.maintenance": "रखरखाव",
  "nav.aiAdvisor": "AI सलाहकार",
  "nav.chat": "AI चैट",
  "nav.anomalies": "विसंगति पहचान",
  "nav.forecast": "सौर पूर्वानुमान",
  "nav.carbon": "कार्बन प्रभाव",
  "nav.settings": "सेटिंग्स",
  "header.title": "संचालन डैशबोर्ड",
  "header.subtitle": "रीयल-टाइम इन्वर्टर फ्लीट इंटेलिजेंस",
  "header.allSystems": "सभी सिस्टम सामान्य",
  "header.signIn": "साइन इन",
  "header.signOut": "साइन आउट",
  "header.language": "भाषा",
  "common.loading": "लोड हो रहा है…",
  "common.error": "त्रुटि",
  "common.retry": "पुनः प्रयास",
  "common.save": "सहेजें",
  "common.cancel": "रद्द करें",
  "common.delete": "हटाएं",
  "common.edit": "संपादित करें",
  "common.add": "जोड़ें",
  "common.search": "खोजें…",
  "common.status": "स्थिति",
  "common.actions": "क्रियाएं",
  "common.healthy": "स्वस्थ",
  "common.warning": "चेतावनी",
  "common.critical": "गंभीर",
  "common.new": "नया",
  "common.live": "लाइव",
  "inverters.title": "इन्वर्टर फ्लीट",
  "inverters.subtitle": "अपने सौर संयंत्र के सभी इन्वर्टरों को प्रबंधित और मॉनिटर करें।",
  "inverters.addInverter": "इन्वर्टर जोड़ें",
  "inverters.total": "कुल इन्वर्टर",
  "inverters.noResults": "कोई इन्वर्टर नहीं मिला।",
  "inverters.allInverters": "सभी इन्वर्टर",
  "inverters.deleteConfirm": "यह कार्रवाई वापस नहीं हो सकती।",
  "weather.title": "मौसम",
  "weather.temperature": "तापमान",
  "weather.wind": "हवा",
  "weather.weathercode": "स्थिति",
  "weather.fetching": "मौसम जानकारी लोड हो रही है…",
  "weather.unavailable": "मौसम जानकारी उपलब्ध नहीं",
};

const es: Translations = {
  "nav.overview": "RESUMEN",
  "nav.fleet": "GESTIÓN DE FLOTA",
  "nav.ai": "FUNCIONES IA",
  "nav.account": "CUENTA",
  "nav.dashboard": "Panel",
  "nav.plants": "Plantas Solares",
  "nav.inverters": "Flota de Inversores",
  "nav.analytics": "Analítica",
  "nav.grid": "DISCOM / Red",
  "nav.maintenance": "Mantenimiento",
  "nav.aiAdvisor": "Asesor IA",
  "nav.chat": "Chat IA",
  "nav.anomalies": "Detectar Anomalías",
  "nav.forecast": "Pronóstico Solar",
  "nav.carbon": "Impacto de Carbono",
  "nav.settings": "Configuración",
  "header.title": "Panel de Operaciones",
  "header.subtitle": "Inteligencia de flota de inversores en tiempo real",
  "header.allSystems": "Todos los sistemas operativos",
  "header.signIn": "Iniciar sesión",
  "header.signOut": "Cerrar sesión",
  "header.language": "Idioma",
  "common.loading": "Cargando…",
  "common.error": "Error",
  "common.retry": "Reintentar",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.delete": "Eliminar",
  "common.edit": "Editar",
  "common.add": "Agregar",
  "common.search": "Buscar…",
  "common.status": "Estado",
  "common.actions": "Acciones",
  "common.healthy": "saludable",
  "common.warning": "advertencia",
  "common.critical": "crítico",
  "common.new": "NUEVO",
  "common.live": "EN VIVO",
  "inverters.title": "Flota de Inversores",
  "inverters.subtitle": "Administre y monitoree todos los inversores de su planta solar.",
  "inverters.addInverter": "Agregar Inversor",
  "inverters.total": "Total Inversores",
  "inverters.noResults": "No se encontraron inversores.",
  "inverters.allInverters": "Todos los Inversores",
  "inverters.deleteConfirm": "Esta acción no se puede deshacer.",
  "weather.title": "Clima",
  "weather.temperature": "Temperatura",
  "weather.wind": "Viento",
  "weather.weathercode": "Condición",
  "weather.fetching": "Obteniendo clima…",
  "weather.unavailable": "Clima no disponible",
};

const fr: Translations = {
  "nav.overview": "APERÇU",
  "nav.fleet": "GESTION DE FLOTTE",
  "nav.ai": "FONCTIONS IA",
  "nav.account": "COMPTE",
  "nav.dashboard": "Tableau de bord",
  "nav.plants": "Centrales Solaires",
  "nav.inverters": "Parc Onduleurs",
  "nav.analytics": "Analytique",
  "nav.grid": "DISCOM / Réseau",
  "nav.maintenance": "Maintenance",
  "nav.aiAdvisor": "Conseiller IA",
  "nav.chat": "Chat IA",
  "nav.anomalies": "Détection d'anomalies",
  "nav.forecast": "Prévision Solaire",
  "nav.carbon": "Impact Carbone",
  "nav.settings": "Paramètres",
  "header.title": "Tableau de Bord des Opérations",
  "header.subtitle": "Intelligence en temps réel de la flotte d'onduleurs",
  "header.allSystems": "Tous les systèmes opérationnels",
  "header.signIn": "Se connecter",
  "header.signOut": "Se déconnecter",
  "header.language": "Langue",
  "common.loading": "Chargement…",
  "common.error": "Erreur",
  "common.retry": "Réessayer",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.delete": "Supprimer",
  "common.edit": "Modifier",
  "common.add": "Ajouter",
  "common.search": "Rechercher…",
  "common.status": "Statut",
  "common.actions": "Actions",
  "common.healthy": "sain",
  "common.warning": "avertissement",
  "common.critical": "critique",
  "common.new": "NOUVEAU",
  "common.live": "EN DIRECT",
  "inverters.title": "Parc d'Onduleurs",
  "inverters.subtitle": "Gérez et surveillez tous les onduleurs de votre centrale solaire.",
  "inverters.addInverter": "Ajouter un Onduleur",
  "inverters.total": "Total Onduleurs",
  "inverters.noResults": "Aucun onduleur trouvé.",
  "inverters.allInverters": "Tous les Onduleurs",
  "inverters.deleteConfirm": "Cette action est irréversible.",
  "weather.title": "Météo",
  "weather.temperature": "Température",
  "weather.wind": "Vent",
  "weather.weathercode": "Condition",
  "weather.fetching": "Récupération météo…",
  "weather.unavailable": "Météo indisponible",
};

// For remaining languages we provide key translations;
// any missing key falls through to English via the context getter.
const de: Partial<Translations> = {
  "nav.overview": "ÜBERSICHT", "nav.fleet": "FLOTTENMANAGEMENT",
  "nav.ai": "KI-FUNKTIONEN", "nav.account": "KONTO",
  "nav.dashboard": "Dashboard", "nav.plants": "Solaranlagen", "nav.inverters": "Wechselrichterflotte",
  "nav.analytics": "Analytik", "nav.grid": "DISCOM / Netz",
  "nav.maintenance": "Wartung", "nav.aiAdvisor": "KI-Berater", "nav.chat": "KI-Chat",
  "nav.anomalies": "Anomalieerkennung", "nav.forecast": "Solarprognose",
  "nav.carbon": "CO₂-Auswirkung", "nav.settings": "Einstellungen",
  "header.title": "Betriebsdashboard", "header.subtitle": "Echtzeit-Wechselrichterflotten-Intelligenz",
  "header.allSystems": "Alle Systeme betriebsbereit",
  "header.signIn": "Anmelden", "header.signOut": "Abmelden",
  "header.language": "Sprache", "common.loading": "Laden…",
  "common.save": "Speichern", "common.cancel": "Abbrechen",
  "common.delete": "Löschen", "common.edit": "Bearbeiten", "common.add": "Hinzufügen",
  "common.search": "Suchen…", "common.healthy": "gesund",
  "common.warning": "Warnung", "common.critical": "kritisch",
  "weather.title": "Wetter", "weather.temperature": "Temperatur", "weather.wind": "Wind",
};

const zh: Partial<Translations> = {
  "nav.overview": "概览", "nav.fleet": "机队管理", "nav.ai": "AI功能", "nav.account": "账户",
  "nav.dashboard": "仪表板", "nav.plants": "太阳能电站", "nav.inverters": "逆变器机队",
  "nav.analytics": "分析", "nav.grid": "配电网", "nav.maintenance": "维护",
  "nav.aiAdvisor": "AI顾问", "nav.chat": "AI聊天", "nav.anomalies": "异常检测",
  "nav.forecast": "太阳能预测", "nav.carbon": "碳排放影响", "nav.settings": "设置",
  "header.title": "运营控制台", "header.subtitle": "实时逆变器机队智能",
  "header.allSystems": "所有系统运行正常",
  "header.signIn": "登录", "header.signOut": "退出", "header.language": "语言",
  "common.loading": "加载中…", "common.save": "保存", "common.cancel": "取消",
  "common.delete": "删除", "common.edit": "编辑", "common.add": "添加",
  "common.search": "搜索…", "common.healthy": "健康", "common.warning": "警告", "common.critical": "严重",
  "weather.title": "天气", "weather.temperature": "温度", "weather.wind": "风速",
};

const ja: Partial<Translations> = {
  "nav.overview": "概要", "nav.fleet": "フリート管理", "nav.ai": "AI機能", "nav.account": "アカウント",
  "nav.dashboard": "ダッシュボード", "nav.plants": "太陽光発電所", "nav.inverters": "インバーターフリート",
  "nav.analytics": "アナリティクス", "nav.grid": "グリッド",
  "nav.maintenance": "メンテナンス", "nav.aiAdvisor": "AIアドバイザー", "nav.chat": "AIチャット",
  "nav.anomalies": "異常検知", "nav.forecast": "太陽光予測",
  "nav.carbon": "炭素影響", "nav.settings": "設定",
  "header.title": "運用ダッシュボード", "header.subtitle": "リアルタイムインバーターフリートインテリジェンス",
  "header.allSystems": "すべてのシステムが正常稼働中",
  "header.signIn": "サインイン", "header.signOut": "サインアウト", "header.language": "言語",
  "common.loading": "読み込み中…", "common.save": "保存", "common.cancel": "キャンセル",
  "common.delete": "削除", "common.edit": "編集", "common.add": "追加",
  "common.search": "検索…", "common.healthy": "正常", "common.warning": "警告", "common.critical": "重大",
  "weather.title": "天気", "weather.temperature": "気温", "weather.wind": "風速",
};

const pt: Partial<Translations> = {
  "nav.overview": "VISÃO GERAL", "nav.fleet": "GESTÃO DE FROTA", "nav.ai": "RECURSOS IA", "nav.account": "CONTA",
  "nav.dashboard": "Painel", "nav.inverters": "Frota de Inversores",
  "nav.analytics": "Análise", "nav.grid": "Rede Elétrica",
  "nav.maintenance": "Manutenção", "nav.aiAdvisor": "Conselheiro IA",
  "nav.anomalies": "Detecção de Anomalias", "nav.forecast": "Previsão Solar",
  "nav.carbon": "Impacto de Carbono", "nav.settings": "Configurações",
  "header.title": "Painel de Operações", "header.subtitle": "Inteligência em tempo real da frota",
  "header.allSystems": "Todos os sistemas operacionais",
  "header.signIn": "Entrar", "header.signOut": "Sair", "header.language": "Idioma",
  "common.loading": "Carregando…", "common.save": "Salvar", "common.cancel": "Cancelar",
  "common.delete": "Excluir", "common.edit": "Editar", "common.add": "Adicionar",
  "common.search": "Buscar…", "common.healthy": "saudável", "common.warning": "aviso", "common.critical": "crítico",
  "weather.title": "Clima", "weather.temperature": "Temperatura", "weather.wind": "Vento",
};

const ru: Partial<Translations> = {
  "nav.overview": "ОБЗОР", "nav.fleet": "УПРАВЛЕНИЕ ФЛОТОМ", "nav.ai": "ФУНКЦИИ ИИ", "nav.account": "АККАУНТ",
  "nav.dashboard": "Дашборд", "nav.inverters": "Парк инверторов",
  "nav.analytics": "Аналитика", "nav.grid": "Электросеть",
  "nav.maintenance": "Техобслуживание", "nav.aiAdvisor": "ИИ советник",
  "nav.anomalies": "Обнаружение аномалий", "nav.forecast": "Солнечный прогноз",
  "nav.carbon": "Углеродный след", "nav.settings": "Настройки",
  "header.title": "Операционный дашборд", "header.subtitle": "Разведка парка инверторов в реальном времени",
  "header.allSystems": "Все системы работают нормально",
  "header.signIn": "Войти", "header.signOut": "Выйти", "header.language": "Язык",
  "common.loading": "Загрузка…", "common.save": "Сохранить", "common.cancel": "Отмена",
  "common.delete": "Удалить", "common.edit": "Редактировать", "common.add": "Добавить",
  "common.search": "Поиск…", "common.healthy": "в норме", "common.warning": "предупреждение", "common.critical": "критично",
  "weather.title": "Погода", "weather.temperature": "Температура", "weather.wind": "Ветер",
};

const it: Partial<Translations> = {
  "nav.overview": "PANORAMICA", "nav.fleet": "GESTIONE FLOTTA", "nav.ai": "FUNZIONI AI", "nav.account": "ACCOUNT",
  "nav.dashboard": "Dashboard", "nav.inverters": "Parco Inverter",
  "nav.analytics": "Analisi", "nav.grid": "Rete Elettrica",
  "nav.maintenance": "Manutenzione", "nav.aiAdvisor": "Consulente AI",
  "nav.anomalies": "Rilevamento Anomalie", "nav.forecast": "Previsione Solare",
  "nav.carbon": "Impatto CO₂", "nav.settings": "Impostazioni",
  "header.title": "Dashboard Operativo", "header.subtitle": "Intelligence in tempo reale della flotta inverter",
  "header.allSystems": "Tutti i sistemi operativi",
  "header.signIn": "Accedi", "header.signOut": "Esci", "header.language": "Lingua",
  "common.loading": "Caricamento…", "common.save": "Salva", "common.cancel": "Annulla",
  "common.delete": "Elimina", "common.edit": "Modifica", "common.add": "Aggiungi",
  "common.search": "Cerca…", "common.healthy": "sano", "common.warning": "avviso", "common.critical": "critico",
  "weather.title": "Meteo", "weather.temperature": "Temperatura", "weather.wind": "Vento",
};

const ko: Partial<Translations> = {
  "nav.overview": "개요", "nav.fleet": "함대 관리", "nav.ai": "AI 기능", "nav.account": "계정",
  "nav.dashboard": "대시보드", "nav.inverters": "인버터 함대",
  "nav.analytics": "분석", "nav.grid": "전력망",
  "nav.maintenance": "유지보수", "nav.aiAdvisor": "AI 어드바이저",
  "nav.anomalies": "이상 감지", "nav.forecast": "태양광 예측",
  "nav.carbon": "탄소 영향", "nav.settings": "설정",
  "header.title": "운영 대시보드", "header.subtitle": "실시간 인버터 함대 인텔리전스",
  "header.allSystems": "모든 시스템 정상 작동",
  "header.signIn": "로그인", "header.signOut": "로그아웃", "header.language": "언어",
  "common.loading": "로딩 중…", "common.save": "저장", "common.cancel": "취소",
  "common.delete": "삭제", "common.edit": "편집", "common.add": "추가",
  "common.search": "검색…", "common.healthy": "정상", "common.warning": "경고", "common.critical": "위험",
  "weather.title": "날씨", "weather.temperature": "온도", "weather.wind": "바람",
};

const ta: Partial<Translations> = {
  "nav.overview": "மேலோட்டம்", "nav.fleet": "கப்பல் மேலாண்மை", "nav.ai": "AI அம்சங்கள்", "nav.account": "கணக்கு",
  "nav.dashboard": "டாஷ்போர்டு", "nav.inverters": "மின்மாற்றி கப்பல்",
  "nav.analytics": "பகுப்பாய்வு", "nav.grid": "கட்டம்",
  "nav.maintenance": "பராமரிப்பு", "nav.aiAdvisor": "AI ஆலோசகர்",
  "nav.anomalies": "அசாதாரண கண்டறிதல்", "nav.forecast": "சூரிய ஒளி முன்கணிப்பு",
  "nav.carbon": "கார்பன் தாக்கம்", "nav.settings": "அமைப்புகள்",
  "header.title": "செயல்பாட்டு டாஷ்போர்டு", "header.subtitle": "நிகழ்நேர மின்மாற்றி கப்பல் நுண்ணறிவு",
  "header.allSystems": "அனைத்து அமைப்புகளும் இயங்குகின்றன",
  "header.signIn": "உள்நுழை", "header.signOut": "வெளியேறு", "header.language": "மொழி",
  "common.loading": "ஏற்றுகிறது…", "common.save": "சேமி", "common.cancel": "ரத்து",
  "common.delete": "நீக்கு", "common.edit": "திருத்து", "common.add": "சேர்",
  "common.search": "தேடு…", "common.healthy": "ஆரோக்கியமான", "common.warning": "எச்சரிக்கை", "common.critical": "அவசர",
  "weather.title": "வானிலை", "weather.temperature": "வெப்பநிலை", "weather.wind": "காற்று",
};

const nl: Partial<Translations> = {
  "nav.overview": "OVERZICHT", "nav.fleet": "VLOOTBEHEER", "nav.ai": "AI-FUNCTIES", "nav.account": "ACCOUNT",
  "nav.dashboard": "Dashboard", "nav.inverters": "Omvormer Vloot",
  "nav.analytics": "Analyse", "nav.grid": "Elektriciteitsnet",
  "nav.maintenance": "Onderhoud", "nav.aiAdvisor": "AI Adviseur",
  "nav.anomalies": "Anomaliedetectie", "nav.forecast": "Zonnevooorspelling",
  "nav.carbon": "Koolstofimpact", "nav.settings": "Instellingen",
  "header.title": "Operationeel Dashboard", "header.subtitle": "Realtime omvormer vlootintelligentie",
  "header.allSystems": "Alle systemen operationeel",
  "header.signIn": "Inloggen", "header.signOut": "Uitloggen", "header.language": "Taal",
  "common.loading": "Laden…", "common.save": "Opslaan", "common.cancel": "Annuleren",
  "common.delete": "Verwijderen", "common.edit": "Bewerken", "common.add": "Toevoegen",
  "common.search": "Zoeken…", "common.healthy": "gezond", "common.warning": "waarschuwing", "common.critical": "kritiek",
  "weather.title": "Weer", "weather.temperature": "Temperatuur", "weather.wind": "Wind",
};

const ar: Partial<Translations> = {
  "nav.overview": "نظرة عامة", "nav.fleet": "إدارة الأسطول", "nav.ai": "ميزات الذكاء الاصطناعي", "nav.account": "الحساب",
  "nav.dashboard": "لوحة التحكم", "nav.inverters": "أسطول المحولات",
  "nav.analytics": "التحليلات", "nav.grid": "الشبكة الكهربائية",
  "nav.maintenance": "الصيانة", "nav.aiAdvisor": "مستشار الذكاء الاصطناعي",
  "nav.anomalies": "الكشف عن الشذوذ", "nav.forecast": "توقعات الطاقة الشمسية",
  "nav.carbon": "أثر الكربون", "nav.settings": "الإعدادات",
  "header.title": "لوحة العمليات", "header.subtitle": "ذكاء أسطول المحولات في الوقت الفعلي",
  "header.allSystems": "جميع الأنظمة تعمل",
  "header.signIn": "تسجيل الدخول", "header.signOut": "تسجيل الخروج", "header.language": "اللغة",
  "common.loading": "جاري التحميل…", "common.save": "حفظ", "common.cancel": "إلغاء",
  "common.delete": "حذف", "common.edit": "تحرير", "common.add": "إضافة",
  "common.search": "بحث…", "common.healthy": "سليم", "common.warning": "تحذير", "common.critical": "حرج",
  "weather.title": "الطقس", "weather.temperature": "درجة الحرارة", "weather.wind": "الرياح",
};

// Map of all locale dictionaries
const dictionaries: Record<LangCode, Partial<Translations>> = {
  en, hi, es, fr, de, zh, ja, pt, ru, it, ko, ta, nl, ar,
};

/**
 * Returns the translation for `key` in `lang`, falling back to English.
 */
export function getTranslation(lang: LangCode, key: TranslationKey): string {
  return (dictionaries[lang]?.[key] ?? en[key]) as string;
}
