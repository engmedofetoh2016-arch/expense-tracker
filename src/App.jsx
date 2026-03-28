import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import InsightsChart from "./components/InsightsChart.jsx";
import ReceiptScanModal from "./components/ReceiptScanModal.jsx";
import { parseReceiptViaOpenAI } from "./api/receiptClient.js";
import {
  exportTransactionsExcel,
  exportTransactionsPdf,
  mapTransactionsForExport,
  safeExportFilenamePart,
} from "./utils/exportReports.js";
import { parseReceiptText } from "./utils/receiptParse.js";

const categories = ["food", "housing", "utilities", "transport", "entertainment", "salary", "other"];

const initialTransactions = [
  { id: 1, description: "Salary", amount: 5000, type: "income", category: "salary", date: "2026-03-01" },
  { id: 2, description: "Rent", amount: 1200, type: "expense", category: "housing", date: "2026-03-02" },
  { id: 3, description: "Groceries", amount: 150, type: "expense", category: "food", date: "2026-03-03" },
  { id: 4, description: "Freelance Work", amount: 800, type: "income", category: "salary", date: "2026-03-05" },
  { id: 5, description: "Electric Bill", amount: 95, type: "expense", category: "utilities", date: "2026-03-06" },
  { id: 6, description: "Dinner Out", amount: 65, type: "expense", category: "food", date: "2026-03-07" },
  { id: 7, description: "Gas", amount: 45, type: "expense", category: "transport", date: "2026-03-08" },
  { id: 8, description: "Netflix", amount: 15, type: "expense", category: "entertainment", date: "2026-03-10" },
];

const translations = {
  en: {
    appTitle: "FlowSpend",
    subtitle: "Private finance OS — smart receipt capture and spend forecasts",
    taglineScan: "OpenAI receipt parse",
    taglineForecast: "Trend forecasts",
    taglinePrivate: "Your data stays on-device",
    language: "العربية",
    themeDark: "Dark",
    themeLight: "Light",
    user: "User",
    users: "Users",
    userPlaceholder: "Enter your name",
    saveUser: "Add/Switch User",
    currentUser: "Current User",
    noUsers: "No users yet",
    privacyNote: "Each profile only sees its own transactions on this device.",
    income: "Income",
    expenses: "Expenses",
    balance: "Balance",
    txCount: "Transactions",
    avgExpense: "Avg Expense",
    addTransaction: "Add Transaction",
    scanReceipt: "Scan receipt",
    scanning: "Reading receipt…",
    description: "Description",
    amount: "Amount",
    date: "Date",
    type: "Type",
    category: "Category",
    action: "Action",
    add: "Add",
    delete: "Delete",
    period: "Period",
    allTime: "All Time",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
    allTypes: "All Types",
    allCategories: "All Categories",
    search: "Search",
    searchPlaceholder: "Search description...",
    sortBy: "Sort By",
    latest: "Latest",
    oldest: "Oldest",
    amountHigh: "Amount (High to Low)",
    amountLow: "Amount (Low to High)",
    from: "From",
    to: "To",
    clearFilters: "Clear Filters",
    noData: "No transactions found for this filter.",
    incomeType: "Income",
    expenseType: "Expense",
    invalidInput: "Enter valid description and amount.",
    reviewReceipt: "Review scanned receipt",
    receiptReviewHintOpenAI: "OpenAI read this receipt — adjust anything before saving.",
    receiptReviewHintLocal: "On-device OCR suggested these values — adjust before saving.",
    cancel: "Cancel",
    addToLedger: "Add to ledger",
    close: "Close",
    ocrError: "Could not read this image. Try a clearer photo or enter manually.",
    insightsTitle: "Spend intelligence",
    insightsSubtitle: "Six-month expense trend with a statistical next-month outlook",
    forecastNextMonth: "Next month (est.)",
    lastMonthSpend: "This month",
    avgSixMonth: "6-mo average",
    narrativePrefix: "Your burn pattern looks",
    narrativeSuffix: "Our model suggests roughly",
    narrativeEnd: "in expenses next month (projection, not advice).",
    trendUp: "tilted upward",
    trendDown: "cooling down",
    trendSteady: "fairly stable",
    seriesActual: "Actual spend",
    seriesForecast: "Forecast",
    actual: "Actual",
    forecast: "Forecast",
    chartFootnote: "* Forecast uses linear regression on your last six monthly expense totals.",
    exportHint: "Export the filtered list below.",
    exportExcel: "Excel",
    exportPdf: "PDF",
    categories: {
      food: "Food",
      housing: "Housing",
      utilities: "Utilities",
      transport: "Transport",
      entertainment: "Entertainment",
      salary: "Salary",
      other: "Other",
    },
  },
  ar: {
    appTitle: "FlowSpend",
    subtitle: "نظام مالي خاص — مسح الإيصالات وتوقعات الإنفاق",
    taglineScan: "OpenAI للإيصالات",
    taglineForecast: "توقعات الاتجاه",
    taglinePrivate: "بياناتك على جهازك",
    language: "English",
    themeDark: "داكن",
    themeLight: "فاتح",
    user: "المستخدم",
    users: "المستخدمون",
    userPlaceholder: "ادخل اسمك",
    saveUser: "إضافة/تبديل المستخدم",
    currentUser: "المستخدم الحالي",
    noUsers: "لا يوجد مستخدمون بعد",
    privacyNote: "كل ملف يرى معاملاته فقط على هذا الجهاز.",
    income: "الدخل",
    expenses: "المصروفات",
    balance: "الرصيد",
    txCount: "عدد العمليات",
    avgExpense: "متوسط المصروف",
    addTransaction: "إضافة عملية",
    scanReceipt: "مسح إيصال",
    scanning: "جاري قراءة الإيصال…",
    description: "الوصف",
    amount: "المبلغ",
    date: "التاريخ",
    type: "النوع",
    category: "الفئة",
    action: "الإجراء",
    add: "إضافة",
    delete: "حذف",
    period: "الفترة",
    allTime: "كل الوقت",
    weekly: "أسبوعي",
    monthly: "شهري",
    yearly: "سنوي",
    allTypes: "كل الأنواع",
    allCategories: "كل الفئات",
    search: "بحث",
    searchPlaceholder: "ابحث في الوصف...",
    sortBy: "الترتيب",
    latest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "المبلغ (من الأكبر للأصغر)",
    amountLow: "المبلغ (من الأصغر للأكبر)",
    from: "من",
    to: "إلى",
    clearFilters: "مسح الفلاتر",
    noData: "لا توجد عمليات مطابقة للفلاتر.",
    incomeType: "دخل",
    expenseType: "مصروف",
    invalidInput: "أدخل وصفا ومبلغا صحيحا.",
    reviewReceipt: "مراجعة الإيصال",
    receiptReviewHintOpenAI: "OpenAI قرأ الإيصال — راجع قبل الحفظ.",
    receiptReviewHintLocal: "التعرف الضوئي على الجهاز اقترح هذه القيم — عدّل قبل الحفظ.",
    cancel: "إلغاء",
    addToLedger: "إضافة للسجل",
    close: "إغلاق",
    ocrError: "تعذر قراءة الصورة. جرّب صورة أوضح أو أدخل يدويا.",
    insightsTitle: "ذكاء الإنفاق",
    insightsSubtitle: "اتجاه ستة أشهر مع تقدير للشهر القادم",
    forecastNextMonth: "الشهر القادم (تقدير)",
    lastMonthSpend: "هذا الشهر",
    avgSixMonth: "متوسط 6 أشهر",
    narrativePrefix: "نمط إنفاقك يبدو",
    narrativeSuffix: "النموذج يقترح تقريبا",
    narrativeEnd: "مصروفات للشهر القادم (تقدير وليس نصيحة).",
    trendUp: "في صعود",
    trendDown: "في هدوء",
    trendSteady: "مستقر نسبيا",
    seriesActual: "إنفاق فعلي",
    seriesForecast: "توقع",
    actual: "فعلي",
    forecast: "توقع",
    chartFootnote: "* التوقع يعتمد على انحدار خطي لمجموع مصروفات آخر ستة أشهر.",
    exportHint: "تصدير القائمة المصفّاة أدناه.",
    exportExcel: "Excel",
    exportPdf: "PDF",
    categories: {
      food: "طعام",
      housing: "سكن",
      utilities: "فواتير",
      transport: "مواصلات",
      entertainment: "ترفيه",
      salary: "راتب",
      other: "أخرى",
    },
  },
};

function getSavedUser() {
  return localStorage.getItem("finance_active_user") || "default";
}

function getSavedTheme() {
  const v = localStorage.getItem("finance_theme");
  if (v === "dark" || v === "light") return v;
  return "light";
}

function persistTransactionsForUser(user, list) {
  localStorage.setItem(`finance_transactions_${user}`, JSON.stringify(list));
}

function getTransactionsForUser(user) {
  const storageKey = `finance_transactions_${user}`;
  const savedTransactions = localStorage.getItem(storageKey);
  if (savedTransactions) {
    return JSON.parse(savedTransactions);
  }
  if (user === "default") {
    return initialTransactions.map((transaction) => ({ ...transaction }));
  }
  return [];
}

function getSavedUsers() {
  const savedUsers = localStorage.getItem("finance_users");
  if (!savedUsers) {
    return ["default"];
  }
  const parsed = JSON.parse(savedUsers);
  return Array.isArray(parsed) && parsed.length > 0 ? parsed : ["default"];
}

function isInPeriod(transactionDate, period) {
  if (period === "all") return true;
  const txDate = new Date(transactionDate);
  const now = new Date();
  if (period === "weekly") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return txDate >= weekAgo && txDate <= now;
  }
  if (period === "monthly") return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
  if (period === "yearly") return txDate.getFullYear() === now.getFullYear();
  return true;
}

function App() {
  const [theme, setTheme] = useState(() => getSavedTheme());
  const [lang, setLang] = useState("en");
  const [activeUser, setActiveUser] = useState(() => getSavedUser());
  const [userInput, setUserInput] = useState(() => getSavedUser());
  const [users, setUsers] = useState(() => getSavedUsers());
  const [transactions, setTransactions] = useState(() => getTransactionsForUser(getSavedUser()));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptProgress, setReceiptProgress] = useState(0);
  const [receiptError, setReceiptError] = useState("");
  const [receiptDraft, setReceiptDraft] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "food",
  });
  const [receiptParseSource, setReceiptParseSource] = useState("local");

  const receiptInputRef = useRef(null);

  const [period, setPeriod] = useState("monthly");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const t = translations[lang];
  const locale = lang === "ar" ? "ar-EG" : "en-US";
  const dir = lang === "ar" ? "rtl" : "ltr";
  const isDark = theme === "dark";

  const formatCurrency = (value) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);

  const clearFilters = () => {
    setPeriod("monthly");
    setFilterType("all");
    setFilterCategory("all");
    setSearchTerm("");
    setSortBy("latest");
    setDateFrom("");
    setDateTo("");
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("finance_theme", theme);
  }, [theme]);

  useEffect(() => {
    persistTransactionsForUser(activeUser, transactions);
  }, [transactions, activeUser]);

  useEffect(() => {
    localStorage.setItem("finance_users", JSON.stringify(users));
  }, [users]);

  const handleSaveUser = () => {
    const normalizedUser = userInput.trim().toLowerCase();
    if (!normalizedUser) {
      return;
    }
    if (normalizedUser !== activeUser) {
      persistTransactionsForUser(activeUser, transactions);
    }
    setActiveUser(normalizedUser);
    setTransactions(getTransactionsForUser(normalizedUser));
    setUsers((previous) => (previous.includes(normalizedUser) ? previous : [...previous, normalizedUser]));
    localStorage.setItem("finance_active_user", normalizedUser);
  };

  const handleSelectUser = (user) => {
    if (user === activeUser) {
      return;
    }
    persistTransactionsForUser(activeUser, transactions);
    setActiveUser(user);
    setUserInput(user);
    setTransactions(getTransactionsForUser(user));
    localStorage.setItem("finance_active_user", user);
  };

  const filteredTransactions = useMemo(() => {
    const list = transactions.filter((transaction) => {
      const matchesType = filterType === "all" || transaction.type === filterType;
      const matchesCategory = filterCategory === "all" || transaction.category === filterCategory;
      const matchesPeriod = isInPeriod(transaction.date, period);
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.trim().toLowerCase());
      const matchesFrom = !dateFrom || transaction.date >= dateFrom;
      const matchesTo = !dateTo || transaction.date <= dateTo;
      return matchesType && matchesCategory && matchesPeriod && matchesSearch && matchesFrom && matchesTo;
    });

    return list.sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.date) - new Date(b.date);
      if (sortBy === "amountHigh") return b.amount - a.amount;
      if (sortBy === "amountLow") return a.amount - b.amount;
      return new Date(b.date) - new Date(a.date);
    });
  }, [transactions, filterType, filterCategory, period, searchTerm, sortBy, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = filteredTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenseCount = filteredTransactions.filter((transaction) => transaction.type === "expense").length;

    return {
      income,
      expenses,
      balance: income - expenses,
      count: filteredTransactions.length,
      averageExpense: expenseCount === 0 ? 0 : expenses / expenseCount,
    };
  }, [filteredTransactions]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!description.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t.invalidInput);
      return;
    }

    setTransactions((previous) => [
      {
        id: Date.now(),
        description: description.trim(),
        amount: parsedAmount,
        type,
        category,
        date,
      },
      ...previous,
    ]);

    setDescription("");
    setAmount("");
    setType("expense");
    setCategory("food");
    setDate(new Date().toISOString().split("T")[0]);
    setError("");
  };

  const handleDelete = (id) => {
    setTransactions((previous) => previous.filter((transaction) => transaction.id !== id));
  };

  const triggerReceiptPick = () => {
    receiptInputRef.current?.click();
  };

  const applyParsedToDraft = (parsed) => {
    setReceiptDraft({
      description: parsed.description,
      amount: parsed.amount != null ? String(parsed.amount) : "",
      date: parsed.date,
      category: categories.includes(parsed.category) ? parsed.category : "other",
    });
  };

  const handleReceiptFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      return;
    }
    setReceiptLoading(true);
    setReceiptProgress(0);
    setReceiptError("");

    try {
      setReceiptProgress(0.2);
      const ai = await parseReceiptViaOpenAI(file);
      setReceiptProgress(1);
      setReceiptParseSource("openai");
      applyParsedToDraft(ai);
      setReceiptOpen(true);
    } catch {
      try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng", 1, {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setReceiptProgress(typeof m.progress === "number" ? m.progress : 0);
            }
          },
        });
        const {
          data: { text },
        } = await worker.recognize(file);
        await worker.terminate();
        const parsed = parseReceiptText(text);
        setReceiptParseSource("local");
        applyParsedToDraft(parsed);
        setReceiptOpen(true);
      } catch {
        setReceiptError(t.ocrError);
        setReceiptParseSource("local");
        setReceiptOpen(true);
        setReceiptDraft({
          description: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          category: "food",
        });
      }
    } finally {
      setReceiptLoading(false);
      setReceiptProgress(0);
    }
  };

  const handleReceiptConfirm = () => {
    const parsedAmount = Number(receiptDraft.amount);
    if (!receiptDraft.description.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setReceiptError(t.invalidInput);
      return;
    }
    setReceiptError("");
    setTransactions((previous) => [
      {
        id: Date.now(),
        description: receiptDraft.description.trim(),
        amount: parsedAmount,
        type: "expense",
        category: receiptDraft.category,
        date: receiptDraft.date,
      },
      ...previous,
    ]);
    setReceiptOpen(false);
  };

  const handleExportExcel = async () => {
    if (filteredTransactions.length === 0) return;
    const rows = mapTransactionsForExport(filteredTransactions, t);
    const stamp = new Date().toISOString().slice(0, 10);
    const user = safeExportFilenamePart(activeUser);
    await exportTransactionsExcel({
      rows,
      t,
      filename: `flowspend-${user}-${stamp}.xlsx`,
    });
  };

  const handleExportPdf = async () => {
    if (filteredTransactions.length === 0) return;
    const rows = mapTransactionsForExport(filteredTransactions, t);
    const stamp = new Date().toISOString().slice(0, 10);
    const user = safeExportFilenamePart(activeUser);
    await exportTransactionsPdf({
      rows,
      t,
      filename: `flowspend-${user}-${stamp}.pdf`,
      formatCurrency,
      title: `${t.appTitle} · ${activeUser} · ${stamp}`,
    });
  };

  return (
    <div className={`app ${dir}`} dir={dir}>
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*"
        className="visually-hidden"
        aria-hidden
        tabIndex={-1}
        onChange={handleReceiptFile}
      />

      <ReceiptScanModal
        open={receiptOpen}
        onClose={() => {
          if (!receiptLoading) setReceiptOpen(false);
        }}
        draft={receiptDraft}
        onChangeDraft={setReceiptDraft}
        onConfirm={handleReceiptConfirm}
        loading={receiptLoading}
        progress={receiptProgress}
        error={receiptError}
        t={t}
        categoryKeys={categories}
        hint={receiptParseSource === "openai" ? t.receiptReviewHintOpenAI : t.receiptReviewHintLocal}
      />

      <div className="top-bar">
        <div>
          <h1>{t.appTitle}</h1>
          <p className="subtitle">{t.subtitle}</p>
          <div className="hero-tags" aria-label="Product highlights">
            <span className="hero-tag">{t.taglineScan}</span>
            <span className="hero-tag">{t.taglineForecast}</span>
            <span className="hero-tag">{t.taglinePrivate}</span>
          </div>
        </div>
        <div className="top-actions">
          <button
            type="button"
            className="theme-btn"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? t.themeLight : t.themeDark}
          >
            {isDark ? t.themeLight : t.themeDark}
          </button>
          <button type="button" className="lang-btn" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
            {t.language}
          </button>
        </div>
      </div>

      <div className="user-switcher">
        <label htmlFor="user-input">{t.user}</label>
        <input
          id="user-input"
          type="text"
          value={userInput}
          placeholder={t.userPlaceholder}
          onChange={(e) => setUserInput(e.target.value)}
        />
        <button type="button" className="save-user-btn" onClick={handleSaveUser}>
          {t.saveUser}
        </button>
        <span className="current-user">
          {t.currentUser}: <strong>{activeUser}</strong>
        </span>
        <div className="users-list-wrap">
          <p className="users-title">{t.users}</p>
          <p className="privacy-note">{t.privacyNote}</p>
          <div className="users-list">
            {users.length === 0 ? (
              <span className="user-chip muted">{t.noUsers}</span>
            ) : (
              users.map((user) => (
                <button
                  type="button"
                  key={user}
                  className={`user-chip ${user === activeUser ? "active-user-chip" : ""}`}
                  onClick={() => handleSelectUser(user)}
                >
                  {user}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="summary summary-5">
        <div className="summary-card">
          <h3>{t.income}</h3>
          <p className="income-amount">{formatCurrency(summary.income)}</p>
        </div>
        <div className="summary-card">
          <h3>{t.expenses}</h3>
          <p className="expense-amount">{formatCurrency(summary.expenses)}</p>
        </div>
        <div className="summary-card">
          <h3>{t.balance}</h3>
          <p className={`balance-amount ${summary.balance < 0 ? "negative-balance" : ""}`}>{formatCurrency(summary.balance)}</p>
        </div>
        <div className="summary-card">
          <h3>{t.txCount}</h3>
          <p className="balance-amount">{summary.count}</p>
        </div>
        <div className="summary-card">
          <h3>{t.avgExpense}</h3>
          <p className="balance-amount">{formatCurrency(summary.averageExpense)}</p>
        </div>
      </div>

      <InsightsChart
        transactions={transactions}
        locale={locale}
        formatCurrency={formatCurrency}
        t={t}
        isDark={isDark}
      />

      <div className="add-transaction">
        <div className="section-head">
          <h2>{t.addTransaction}</h2>
          <button type="button" className="scan-receipt-btn" onClick={triggerReceiptPick} disabled={receiptLoading}>
            {receiptLoading ? t.scanning : t.scanReceipt}
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder={t.description} value={description} onChange={(e) => setDescription(e.target.value)} />
          <input type="number" placeholder={t.amount} value={amount} min="0" step="0.01" onChange={(e) => setAmount(e.target.value)} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="income">{t.incomeType}</option>
            <option value="expense">{t.expenseType}</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((currentCategory) => (
              <option key={currentCategory} value={currentCategory}>
                {t.categories[currentCategory]}
              </option>
            ))}
          </select>
          <button type="submit">{t.add}</button>
        </form>
        {error ? <p className="error-message">{error}</p> : null}
      </div>

      <div className="transactions">
        <div className="transactions-toolbar">
          <h2>{t.txCount}</h2>
          <div className="export-actions">
            <span className="export-hint">{t.exportHint}</span>
            <button
              type="button"
              className="export-btn export-btn-excel"
              disabled={filteredTransactions.length === 0}
              onClick={handleExportExcel}
            >
              {t.exportExcel}
            </button>
            <button
              type="button"
              className="export-btn export-btn-pdf"
              disabled={filteredTransactions.length === 0}
              onClick={handleExportPdf}
            >
              {t.exportPdf}
            </button>
          </div>
        </div>
        <div className="filters advanced-filters">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="all">{t.allTime}</option>
            <option value="weekly">{t.weekly}</option>
            <option value="monthly">{t.monthly}</option>
            <option value="yearly">{t.yearly}</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">{t.allTypes}</option>
            <option value="income">{t.incomeType}</option>
            <option value="expense">{t.expenseType}</option>
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">{t.allCategories}</option>
            {categories.map((currentCategory) => (
              <option key={currentCategory} value={currentCategory}>
                {t.categories[currentCategory]}
              </option>
            ))}
          </select>
          <input type="text" placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="latest">{t.latest}</option>
            <option value="oldest">{t.oldest}</option>
            <option value="amountHigh">{t.amountHigh}</option>
            <option value="amountLow">{t.amountLow}</option>
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label={t.from} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label={t.to} />
          <button type="button" className="clear-btn" onClick={clearFilters}>
            {t.clearFilters}
          </button>
        </div>

        {filteredTransactions.length === 0 ? (
          <p className="empty-state">{t.noData}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.date}</th>
                  <th>{t.description}</th>
                  <th>{t.category}</th>
                  <th>{t.type}</th>
                  <th>{t.amount}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.date}</td>
                    <td>{transaction.description}</td>
                    <td>{t.categories[transaction.category]}</td>
                    <td className="capitalize">{transaction.type === "income" ? t.incomeType : t.expenseType}</td>
                    <td className={transaction.type === "income" ? "income-value" : "expense-value"}>
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td>
                      <button type="button" className="delete-btn" onClick={() => handleDelete(transaction.id)}>
                        {t.delete}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
