import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../../components/Zxcvbn/Password";
import Terms from "../Terms/Terms.jsx";
import PrivacyPolicy from "../PrivacyPolicy/PrivacyPolicy.jsx";
import styles from "./Newreg.module.css";

// public/assets/login/ 直下にあるすべてのjpg,jpeg,png,webp画像を自動で読み込む
const imageModules = import.meta.glob("/public/assets/login/*.{jpg,jpeg,png,webp}", { eager: true });
const BACKGROUND_IMAGES = Object.values(imageModules).map((mod) => mod.default);
const SCROLL_BOTTOM_TOLERANCE = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getRandomBackgroundImage() {
    if (BACKGROUND_IMAGES.length === 0) {
        return "";
    }

    const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
    return BACKGROUND_IMAGES[randomIndex];
}

const POLICY_CONTENT = {
    terms: {
        title: "利用規約",
        ...Terms.legalContent,
    },
    privacy: {
        title: "プライバシーポリシー",
        ...PrivacyPolicy.legalContent,
    },
};

function paragraphToText(paragraph) {
    if (typeof paragraph === "string") {
        return paragraph;
    }

    if (paragraph?.parts) {
        return paragraph.parts.map((part) => part.text).join("");
    }

    return "";
}

function PolicyRow({ title, confirmed, onOpen }) {
    return (
        <button type="button" className={styles.policyRow} onClick={onOpen}>
            <span className={styles.policyIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M7 3.75h7.25L18 7.5v12.75H7V3.75Z" />
                    <path d="M14 3.75V8h4" />
                    <path d="M9.75 12h4.5M9.75 15h4.5" />
                </svg>
            </span>
            <span className={styles.policyRowTitle}>{title}</span>
            <span className={confirmed ? styles.policyStatusDone : styles.policyStatusPending}>
                {confirmed ? "確認済み" : "未確認"}
            </span>
            {confirmed && <span className={styles.policyCheck} aria-hidden="true">✓</span>}
            <span className={styles.policyChevron} aria-hidden="true">›</span>
        </button>
    );
}

export default function Newreg() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [touched, setTouched] = useState(false);
    const [passwordData, setPasswordData] = useState({
        password: "",
        confirm: "",
        isValid: false,
    });
    const [termsConfirmed, setTermsConfirmed] = useState(false);
    const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [activePolicy, setActivePolicy] = useState(null);
    const [reachedBottom, setReachedBottom] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const policyBodyRef = useRef(null);

    // 背景画像用のステート（初期表示ごとにランダムで1枚選ぶ）
    const [bgImage] = useState(getRandomBackgroundImage);

    useEffect(() => {
        if (!activePolicy) {
            return undefined;
        }

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setActivePolicy(null);
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [activePolicy]);

    const checkPolicyScroll = () => {
        const body = policyBodyRef.current;

        if (!body) {
            return;
        }

        const remaining = body.scrollHeight - body.scrollTop - body.clientHeight;
        setReachedBottom(remaining <= SCROLL_BOTTOM_TOLERANCE);
    };

    useEffect(() => {
        if (!activePolicy) {
            return undefined;
        }

        const animationFrameId = requestAnimationFrame(checkPolicyScroll);

        return () => cancelAnimationFrame(animationFrameId);
    }, [activePolicy]);

    const openPolicy = (policyType) => {
        setReachedBottom(false);
        setActivePolicy(policyType);
    };

    const closePolicy = () => {
        setActivePolicy(null);
    };

    const confirmActivePolicy = () => {
        if (!reachedBottom || !activePolicy) {
            return;
        }

        if (activePolicy === "terms") {
            setTermsConfirmed(true);
        }

        if (activePolicy === "privacy") {
            setPrivacyConfirmed(true);
        }

        setActivePolicy(null);
    };

    const isNameValid = name.trim() !== "";
    const isEmailValid = EMAIL_PATTERN.test(email.trim());
    const hasConfirmedPolicies = termsConfirmed && privacyConfirmed;
    const isFormValid = isNameValid && isEmailValid && passwordData.isValid && hasConfirmedPolicies && agreed;
    const currentPolicy = activePolicy ? POLICY_CONTENT[activePolicy] : null;

    // 登録フォーム送信ハンドラ
    const handleRegister = async (event) => {
        event.preventDefault();
        setTouched(true);
        setErrorMessage("");

        if (!isFormValid) {
            if (!hasConfirmedPolicies || !agreed) {
                setErrorMessage("利用規約とプライバシーポリシーを確認し、同意してください。");
            }
            return;
        }

        try {
            const response = await fetch("/TABI/api/auth/register.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    password: passwordData.password,
                    name,
                    terms_agreed: true,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setErrorMessage(data.message || "登録に失敗しました。");
                return;
            }

            localStorage.setItem("loginUser", JSON.stringify(data.user));
            navigate("/Home");
        } catch (error) {
            console.error("登録エラー:", error);
            setErrorMessage("通信環境を確認してください。");
        }
    };

    return (
        <div
            className={styles.loginPage}
            style={{ backgroundImage: bgImage ? `url(${bgImage})` : "none" }}
        >
            <div className={styles.loginContainer}>
                <div className={styles.loginCard}>
                    <h2 className={styles.title}>新規登録</h2>

                    <form onSubmit={handleRegister}>
                        <input
                            className={styles.input}
                            type="text"
                            placeholder="ユーザー名"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        <input
                            className={styles.input}
                            type="email"
                            placeholder="メールアドレス"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setTouched(true)}
                        />

                        {touched && email.trim() === "" && (
                            <p className={styles.error}>メールアドレスを入力してください</p>
                        )}

                        {touched && email.trim() !== "" && !isEmailValid && (
                            <p className={styles.error}>メールアドレスの形式を確認してください</p>
                        )}

                        <p className={styles.passwordNotice}>
                            パスワードには大文字・小文字・数字を含めてください
                            <br />パスワードは6文字以上にしてください。
                        </p>

                        <PasswordInput onChange={setPasswordData} />

                        <div className={styles.policySection}>
                            <p className={styles.policyLead}>
                                ご登録には、利用規約とプライバシーポリシーの内容確認および同意が必要です。
                            </p>
                            <div className={styles.policyRows}>
                                <PolicyRow
                                    title="利用規約を確認する"
                                    confirmed={termsConfirmed}
                                    onOpen={() => openPolicy("terms")}
                                />
                                <PolicyRow
                                    title="プライバシーポリシーを確認する"
                                    confirmed={privacyConfirmed}
                                    onOpen={() => openPolicy("privacy")}
                                />
                            </div>
                            <label
                                className={`${styles.agreementLabel} ${
                                    hasConfirmedPolicies ? "" : styles.agreementLabelDisabled
                                }`}
                            >
                                <input
                                    className={styles.agreementCheckbox}
                                    type="checkbox"
                                    checked={agreed}
                                    disabled={!hasConfirmedPolicies}
                                    onChange={(event) => setAgreed(event.target.checked)}
                                />
                                <span>利用規約とプライバシーポリシーに同意します</span>
                            </label>
                        </div>

                        {errorMessage && <p className={styles.error}>{errorMessage}</p>}

                        <div className={styles.btnWrap}>
                            <button
                                className={styles.btn}
                                type="submit"
                                disabled={!isFormValid}
                            >
                                登録
                            </button>

                            {!isFormValid && (
                                <p className={styles.disabledHint}>
                                    入力内容と規約同意をご確認ください
                                </p>
                            )}
                        </div>
                    </form>

                    <button
                        type="button"
                        className={styles.btn}
                        onClick={() => navigate("/")}
                    >
                        戻る
                    </button>
                </div>
            </div>

            {currentPolicy && (
                <div
                    className={styles.policyOverlay}
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closePolicy();
                        }
                    }}
                >
                    <section
                        className={styles.policyModal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="policyModalTitle"
                    >
                        <header className={styles.policyModalHeader}>
                            <h2 id="policyModalTitle" className={styles.policyModalTitle}>
                                {currentPolicy.title}
                            </h2>
                            <button
                                type="button"
                                className={styles.policyCloseButton}
                                aria-label="閉じる"
                                onClick={closePolicy}
                            >
                                ×
                            </button>
                        </header>

                        <div
                            ref={policyBodyRef}
                            className={styles.policyBody}
                            onScroll={checkPolicyScroll}
                            tabIndex="0"
                        >
                            <p className={styles.policyUpdated}>最終更新日：{currentPolicy.updatedAt}</p>
                            {currentPolicy.introduction.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                            {currentPolicy.sections.map((section) => (
                                <section key={section.title} className={styles.policyArticle}>
                                    <h3>{section.title}</h3>
                                    {section.paragraphs?.map((paragraph, index) => (
                                        <p key={`${section.title}-p-${index}`}>{paragraphToText(paragraph)}</p>
                                    ))}
                                    {section.items && (
                                        <ul>
                                            {section.items.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            ))}
                        </div>

                        <footer className={styles.policyModalFooter}>
                            {!reachedBottom && (
                                <p className={styles.policyScrollHint}>
                                    最後までスクロールしてください
                                </p>
                            )}
                            <button
                                type="button"
                                className={styles.policyConfirmButton}
                                disabled={!reachedBottom}
                                onClick={confirmActivePolicy}
                            >
                                内容を確認しました
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </div>
    );
}
