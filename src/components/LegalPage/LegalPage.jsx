/**
 * 利用規約やプライバシーポリシーなど、文章中心の案内画面を表示します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { Link, useNavigate } from 'react-router-dom';
import styles from './LegalPage.module.css';

/**
 * BackIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function BackIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 5-7 7 7 7" />
        </svg>
    );
}

/**
 * HomeIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function HomeIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5.5 10.5V20h13v-9.5" />
            <path d="M9.5 20v-5h5v5" />
        </svg>
    );
}

/**
 * UserIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function UserIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
    );
}

/**
 * renderParagraph は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function renderParagraph(paragraph, sectionIndex, paragraphIndex) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (typeof paragraph === 'string') {
        return <p key={`${sectionIndex}-${paragraphIndex}`}>{paragraph}</p>;
    }

    return (
        <p key={`${sectionIndex}-${paragraphIndex}`}>
            {paragraph.parts.map((part, partIndex) => {
                if (part.to) {
                    return (
                        <Link key={partIndex} to={part.to} className={styles.inlineLink}>
                            {part.text}
                        </Link>
                    );
                }
                return part.text;
            })}
        </p>
    );
}

/**
 * LegalPage は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function LegalPage({ title, updatedAt, introduction, sections }) {
    const navigate = useNavigate();

    // handleBack は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleBack = () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }
        navigate('/MyPage');
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button type="button" className={styles.backButton} onClick={handleBack} aria-label="前のページへ戻る">
                    <BackIcon className={styles.headerIcon} />
                </button>
                <h1 className={styles.headerTitle}>{title}</h1>
                <span className={styles.headerSpacer} />
            </header>

            <main className={styles.content}>
                <article className={styles.card}>
                    <div className={styles.intro}>
                        <p className={styles.updatedAt}>最終更新日：{updatedAt}</p>
                        {introduction.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                    </div>

                    {sections.map((section, sectionIndex) => (
                        <section key={section.title} className={styles.section}>
                            <h2>{section.title}</h2>
                            {section.paragraphs?.map((paragraph, paragraphIndex) => renderParagraph(paragraph, sectionIndex, paragraphIndex))}
                            {section.items && (
                                <ul>
                                    {section.items.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ))}
                </article>
            </main>

            <footer className={styles.footer}>
                <button type="button" className={styles.footerItem} onClick={() => navigate('/Home')} aria-label="ホーム">
                    <HomeIcon className={styles.footerIcon} />
                    <span>ホーム</span>
                </button>
                <button type="button" className={[styles.footerItem, styles.footerItemActive].join(' ')} onClick={() => navigate('/MyPage')} aria-label="マイページ">
                    <UserIcon className={styles.footerIcon} />
                    <span>マイページ</span>
                </button>
            </footer>
        </div>
    );
}

export default LegalPage;
