import { useLanguage } from "./i18n";
import { repositoryUrl, seo } from "./seo";
export function About() {
  const { language } = useLanguage();
  const copy = seo[language];
  return (
    <details className="about-tool">
      <summary>{copy.about}</summary>
      <h2>{copy.heading}</h2>
      <p>{copy.body}</p>
      <p>{copy.help}</p>
      <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">
        {copy.source}
      </a>
    </details>
  );
}
