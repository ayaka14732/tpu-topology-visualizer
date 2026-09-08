import { seo } from "./seo";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
export type Language = "en" | "fr" | "zh";
const translations: Record<string, [string, string]> = {
  "View source on GitHub": [
    "Voir le code source sur GitHub",
    "在 GitHub 上查看源代码",
  ],
  "TPU Topology Visualizer": ["Visualiseur de topologie TPU", "TPU 拓扑可视化"],
  Language: ["Langue", "语言"],
  Controls: ["Commandes", "控制"],
  "Topology controls": ["Commandes de topologie", "拓扑控制"],
  Configure: ["Configurer", "设置"],
  Start: ["Démarrer", "开始"],
  Stop: ["Arrêter", "停止"],
  "Color Settings": ["Réglages des couleurs", "配色设置"],
  "Back to Main": ["Retour", "返回主面板"],
  "Click on a color swatch to customize.": [
    "Cliquez sur une couleur pour la personnaliser.",
    "点击色块自定义颜色。",
  ],
  "Visualize the TPU version and topology layout.": [
    "Explorez les modèles TPU et leur topologie.",
    "查看 TPU 型号与拓扑布局。",
  ],
  "TPU version": ["Modèle TPU", "TPU 型号"],
  "Choose TPU version": ["Choisir le modèle TPU", "选择 TPU 型号"],
  "Close TPU version": ["Fermer le choix du modèle", "关闭型号选择"],
  Topology: ["Topologie", "拓扑"],
  Layout: ["Disposition", "布局"],
  "Cartesian Grid": ["Grille cartésienne", "笛卡尔网格"],
  "Visualization options": ["Options de visualisation", "显示选项"],
  "Selection Details": ["Détails de la sélection", "选择详情"],
  "Select an element...": ["Sélectionnez un élément…", "请选择一个元素…"],
  Coordinates: ["Coordonnées", "坐标"],
  Logical: ["Coordonnées logiques", "逻辑坐标"],
  "Chip Type": ["Type de puce", "芯片型号"],
  "Connected TPUs": ["TPU connectés", "连接的 TPU"],
  "Link Type": ["Type de liaison", "连接类型"],
  "Wrap Link": ["Liaison de bouclage", "环绕连接"],
  Yes: ["Oui", "是"],
  No: ["Non", "否"],
  "System Specs": ["Caractéristiques", "系统规格"],
  "Total Chips": ["Nombre de puces", "芯片总数"],
  "Total Hosts": ["Nombre d’hôtes", "主机总数"],
  "Topology Type": ["Type de topologie", "拓扑类型"],
  "Stop Auto-Rotate": ["Arrêter la rotation automatique", "停止自动旋转"],
  "Start Auto-Rotate": ["Démarrer la rotation automatique", "开始自动旋转"],
  "Stop Rotation": ["Arrêter la rotation", "停止旋转"],
  "Auto-Rotate": ["Rotation automatique", "自动旋转"],
  "Color Scheme": ["Palette", "配色方案"],
  "Schematic Outlines": ["Contours schématiques", "轮廓线"],
  "Reset to Scheme Default": [
    "Rétablir les couleurs de la palette",
    "恢复配色方案默认值",
  ],
  Background: ["Arrière-plan", "背景"],
  Original: ["Originale", "原始"],
  Pastel: ["Pastel", "柔和"],
  Greyscale: ["Niveaux de gris", "灰度"],
  Hosts: ["Hôtes", "主机"],
  TPUs: ["TPU", "TPU"],
  "ICI Copper": ["ICI cuivre", "ICI 铜连接"],
  "OCS (Optical)": ["OCS (optique)", "OCS（光连接）"],
  mesh: ["maillage", "网格"],
  cylinder: ["cylindre", "圆柱"],
  torus: ["tore", "环面"],
  twisted_torus: ["tore torsadé", "扭曲环面"],
  "Hardware Acceleration Missing": [
    "Accélération matérielle indisponible",
    "硬件加速不可用",
  ],
  "This app requires a GPU or hardware accelerator to function correctly. It looks like your device doesn't have one enabled or available.":
    [
      "Cette application nécessite un GPU ou une accélération matérielle. Votre appareil ne semble pas en disposer ou cette fonction est désactivée.",
      "此应用需要 GPU 或硬件加速。你的设备可能未启用或不支持硬件加速。",
    ],
  "Without GPU support, nothing may load or performance might be largely degraded.":
    [
      "Sans GPU, le contenu peut ne pas s’afficher ou fonctionner très lentement.",
      "没有 GPU 支持时，内容可能无法显示或性能大幅下降。",
    ],
  "[Try Anyway]": ["[Essayer quand même]", "[仍然尝试]"],
  "Scene instructions": [
    "Topologie TPU interactive. Faites glisser pour tourner, défiler pour zoomer, glisser avec le bouton droit pour déplacer et cliquez pour sélectionner.",
    "交互式 TPU 拓扑。拖动旋转，滚动缩放，右键拖动平移，点击选择。",
  ],
};
export function translate(language: Language, text: string): string {
  if (language === "en")
    return text === "Scene instructions"
      ? "Interactive TPU topology. Drag to rotate, scroll to zoom, right-drag to pan, click to select."
      : text;
  const entry = translations[text];
  if (entry) return entry[language === "fr" ? 0 : 1];
  const fr = language === "fr";
  let m = text.match(/^(Torus|Cylinder) \(Wrap ([A-Z-]+)\)$/);
  if (m)
    return fr
      ? `${m[1] === "Torus" ? "Tore" : "Cylindre"} (bouclage ${m[2]})`
      : `${m[1] === "Torus" ? "环面" : "圆柱"}（${m[2]} 环绕）`;
  m = text.match(/^Reset (.+) to default$/);
  if (m) return fr ? `Rétablir ${m[1]}` : `恢复${m[1]}默认值`;
  m = text.match(/^(.+) (hex color|color swatch)$/);
  if (m)
    return fr
      ? `${m[1]} : ${m[2] === "hex color" ? "couleur hexadécimale" : "échantillon de couleur"}`
      : `${m[1]}${m[2] === "hex color" ? "十六进制颜色" : "色块"}`;
  m = text.match(/^(.+) axis$/);
  if (m) return fr ? `Axe ${m[1]}` : `${m[1]} 轴`;
  m = text.match(/^(\d+) values$/);
  if (m) return fr ? `${m[1]} valeurs` : `${m[1]} 个值`;
  return text
    .replace("Host Machine (Group ", fr ? "Hôte (groupe " : "主机（分组 ")
    .replace("PCIe Host-TPU", fr ? "PCIe hôte-TPU" : "PCIe 主机-TPU")
    .replace(/Wrap/g, fr ? "Bouclage" : "环绕")
    .replace(/\(Copper\)/g, fr ? "(cuivre)" : "（铜）")
    .replace(/\(Cu\)/g, fr ? "(Cu)" : "（铜）");
}
const Context = createContext({
  language: "en" as Language,
  setLanguage: (_language: Language) => {},
  t: (text: string) => text,
});
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("tpu-viz-language");
      if (saved === "en" || saved === "fr" || saved === "zh") return saved;
    } catch {}
    return "en";
  });
  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : language;
    document.title = seo[language].title;
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ])
      document
        .querySelector(selector)
        ?.setAttribute("content", seo[language].description);
    for (const selector of [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
    ])
      document
        .querySelector(selector)
        ?.setAttribute("content", seo[language].title);
    document
      .querySelector('meta[property="og:locale"]')
      ?.setAttribute(
        "content",
        { en: "en_US", fr: "fr_FR", zh: "zh_CN" }[language],
      );
    const otherLocales = Object.entries({
      en: "en_US",
      fr: "fr_FR",
      zh: "zh_CN",
    })
      .filter(([key]) => key !== language)
      .map(([, locale]) => locale);
    document
      .querySelectorAll('meta[property="og:locale:alternate"]')
      .forEach((meta, index) => {
        meta.setAttribute("content", otherLocales[index]);
      });
    try {
      localStorage.setItem("tpu-viz-language", language);
    } catch {}
  }, [language]);
  return (
    <Context.Provider
      value={{ language, setLanguage, t: (text) => translate(language, text) }}
    >
      {children}
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
export function LanguagePicker() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="language-picker">
      <span>{t("Language")}</span>
      <select
        aria-label={t("Language")}
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
      >
        <option value="en">English</option>
        <option value="fr">Français</option>
        <option value="zh">中文</option>
      </select>
    </label>
  );
}
