import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import InsightsChart from "./components/InsightsChart.jsx";
import ReceiptScanModal from "./components/ReceiptScanModal.jsx";
import UnsortedInbox from "./components/UnsortedInbox.jsx";
import CategoryManager from "./components/CategoryManager.jsx";
import AuthPage from "./components/AuthPage.jsx";
import {
  confirmReceipt,
  deleteReceipt,
  fetchUnsortedReceipts,
  receiptImageUrl,
  updateReceiptDraft,
  uploadReceipt,
} from "./api/receiptsClient.js";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
} from "./api/categoriesClient.js";
import {
  bulkImportTransactions,
  createTransaction,
  deleteTransaction,
  downloadAllTransactionsCsv,
  fetchTransactions,
} from "./api/transactionsClient.js";
import { useAuth } from "./context/useAuth.js";
import SettingsModal from "./components/SettingsModal.jsx";
import {
  fetchSupportedCurrencies,
  fetchSettings,
  updateSettings,
} from "./api/settingsClient.js";
import { downloadFullBackup, restoreFullBackup } from "./api/backupClient.js";
import { formatMoney, transactionAmountBase } from "./utils/money.js";
import {
  exportTransactionsExcel,
  exportTransactionsPdf,
  mapTransactionsForExport,
  safeExportFilenamePart,
} from "./utils/exportReports.js";
import {
  exportFilteredCsv,
  parseTransactionsCsv,
} from "./utils/csvTransactions.js";
import { parseReceiptText } from "./utils/receiptParse.js";

function resolveCategoryFromParsed(parsedCategory, categoryList) {
  const normalized = typeof parsedCategory === "string" ? parsedCategory.trim().toLowerCase() : "";
  const slugs = new Set(categoryList.map((item) => item.slug));
  if (slugs.has(normalized)) return normalized;
  const byLabel = categoryList.find((item) => item.label.trim().toLowerCase() === normalized);
  if (byLabel) return byLabel.slug;
  if (slugs.has("other")) return "other";
  return categoryList[0]?.slug ?? "other";
}

function defaultCategorySlug(categoryList) {
  return categoryList.find((item) => item.slug === "food")?.slug ?? categoryList[0]?.slug ?? "other";
}

const translations = {
  en: {
    appTitle: "FlowSpend",
    subtitle: "Private finance OS — smart receipt capture and spend forecasts",
    taglineScan: "OpenAI receipt parse",
    taglineForecast: "Trend forecasts",
    taglinePrivate: "Private account per user",
    signedInAs: "Signed in as",
    logout: "Log out",
    loadingData: "Loading your ledger…",
    income: "Income",
    expenses: "Expenses",
    balance: "Balance",
    txCount: "Transactions",
    avgExpense: "Avg Expense",
    addTransaction: "Add Transaction",
    scanReceiptCamera: "Camera",
    scanReceiptUpload: "Upload photo",
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
    language: "العربية",
    themeDark: "Dark",
    themeLight: "Light",
    saveFailed: "Could not save. Try again.",
    deleteFailed: "Could not delete. Try again.",
    manageCategories: "Manage categories",
    categoriesHint: "Add your own categories. Slugs are used in CSV import/export.",
    newCategoryPlaceholder: "New category name",
    addCategory: "Add category",
    pickColor: "Pick a color",
    importCsv: "Import CSV",
    exportCsvFiltered: "CSV (filtered)",
    exportCsvAll: "CSV (all)",
    backupJson: "Backup JSON",
    restoreJson: "Restore JSON",
    importSuccess: "Imported {count} transactions.",
    importFailed: "Import failed.",
    categoryFailed: "Category action failed.",
    unsortedTitle: "Unsorted receipts",
    unsortedSubtitle: "Saved on the server — review and add to your ledger when ready.",
    unsortedEmpty: "No pending receipts. Scan or upload to fill this inbox.",
    amountPending: "Amount pending",
    viewReceipt: "View",
    receiptColumn: "Receipt",
    settingsTitle: "Settings",
    settingsHint: "Your base currency is used for balance, charts, and converted totals.",
    baseCurrency: "Base currency",
    saveSettings: "Save settings",
    currency: "Currency",
    duplicateReceiptTitle: "Duplicate receipt image",
    duplicateReceiptBody: "This exact image was uploaded before.",
    duplicateTxTitle: "Possible duplicate transaction",
    duplicateTxBody: "A similar entry already exists in your ledger.",
    saveAnyway: "Save anyway",
    backupFull: "Full backup",
    convertedNote: "converted",
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
    taglinePrivate: "حساب خاص لكل مستخدم",
    signedInAs: "مسجل الدخول كـ",
    logout: "تسجيل الخروج",
    loadingData: "جاري تحميل السجل…",
    income: "الدخل",
    expenses: "المصروفات",
    balance: "الرصيد",
    txCount: "عدد العمليات",
    avgExpense: "متوسط المصروف",
    addTransaction: "إضافة عملية",
    scanReceiptCamera: "كاميرا",
    scanReceiptUpload: "رفع صورة",
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
    language: "English",
    themeDark: "داكن",
    themeLight: "فاتح",
    saveFailed: "تعذر الحفظ. حاول مرة أخرى.",
    deleteFailed: "تعذر الحذف. حاول مرة أخرى.",
    manageCategories: "إدارة الفئات",
    categoriesHint: "أضف فئاتك. تُستخدم الرموز في استيراد/تصدير CSV.",
    newCategoryPlaceholder: "اسم الفئة الجديدة",
    addCategory: "إضافة فئة",
    pickColor: "اختر لونًا",
    importCsv: "استيراد CSV",
    exportCsvFiltered: "CSV (مصفّى)",
    exportCsvAll: "CSV (الكل)",
    backupJson: "نسخ JSON",
    restoreJson: "استعادة JSON",
    importSuccess: "تم استيراد {count} عملية.",
    importFailed: "فشل الاستيراد.",
    categoryFailed: "فشلت عملية الفئة.",
    unsortedTitle: "إيصالات غير مرتبة",
    unsortedSubtitle: "محفوظة على الخادم — راجعها وأضفها للسجل عندما تكون جاهزًا.",
    unsortedEmpty: "لا إيصالات معلقة. امسح أو ارفع لملء صندوق الوارد.",
    amountPending: "المبلغ معلق",
    viewReceipt: "عرض",
    receiptColumn: "إيصال",
    settingsTitle: "الإعدادات",
    settingsHint: "عملتك الأساسية تُستخدم للرصيد والرسوم البيانية والمجاميع المحوّلة.",
    baseCurrency: "العملة الأساسية",
    saveSettings: "حفظ الإعدادات",
    currency: "العملة",
    duplicateReceiptTitle: "صورة إيصال مكررة",
    duplicateReceiptBody: "تم رفع هذه الصورة من قبل.",
    duplicateTxTitle: "معاملة possibly مكررة",
    duplicateTxBody: "يوجد إدخال مشابه في سجلك.",
    saveAnyway: "حفظ على أي حال",
    backupFull: "نسخة كاملة",
    convertedNote: "محوّل",
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

function getSavedTheme() {
  const v = localStorage.getItem("finance_theme");
  if (v === "dark" || v === "light") return v;
  return "light";
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
  const { user, loading: authLoading, logout } = useAuth();
  const [theme, setTheme] = useState(() => getSavedTheme());
  const [lang, setLang] = useState("en");
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [supportedCurrencies, setSupportedCurrencies] = useState([{ code: "USD", label: "US Dollar" }]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [pendingReceiptFile, setPendingReceiptFile] = useState(null);
  const [txCurrency, setTxCurrency] = useState("USD");
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
    currency: "USD",
  });
  const [receiptParseSource, setReceiptParseSource] = useState("local");
  const [activeReceiptId, setActiveReceiptId] = useState(null);
  const [unsortedReceipts, setUnsortedReceipts] = useState([]);
  const [receiptBusyId, setReceiptBusyId] = useState(null);

  const receiptInputRef = useRef(null);
  const receiptCameraInputRef = useRef(null);
  const csvImportRef = useRef(null);
  const jsonImportRef = useRef(null);

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

  const formatCurrency = (value) => formatMoney(value, baseCurrency, locale);

  const categoryLabels = useMemo(() => {
    const map = {};
    for (const item of categories) {
      map[item.slug] = t.categories[item.slug] ?? item.label;
    }
    return map;
  }, [categories, t.categories]);

  const defaultCategory = useMemo(() => defaultCategorySlug(categories), [categories]);

  const refreshUnsorted = async () => {
    try {
      const rows = await fetchUnsortedReceipts();
      setUnsortedReceipts(rows);
    } catch {
      setUnsortedReceipts([]);
    }
  };

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
    if (!user) {
      setTransactions([]);
      setCategories([]);
      return;
    }

    let cancelled = false;
    setDataLoading(true);
    Promise.all([
      fetchTransactions(),
      fetchCategories(),
      fetchUnsortedReceipts(),
      fetchSettings(),
      fetchSupportedCurrencies(),
    ])
      .then(([rows, cats, inbox, settings, currencyList]) => {
        if (cancelled) return;
        setTransactions(rows);
        setCategories(cats);
        setUnsortedReceipts(inbox);
        setBaseCurrency(settings?.baseCurrency || user.baseCurrency || "USD");
        setTxCurrency(settings?.baseCurrency || user.baseCurrency || "USD");
        setSupportedCurrencies(currencyList);
        const fallback = defaultCategorySlug(cats);
        setCategory((current) => (cats.some((item) => item.slug === current) ? current : fallback));
        setReceiptDraft((current) => ({
          ...current,
          category: cats.some((item) => item.slug === current.category) ? current.category : fallback,
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setTransactions([]);
          setCategories([]);
        }
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

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
      .reduce((sum, transaction) => sum + transactionAmountBase(transaction), 0);
    const expenses = filteredTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transactionAmountBase(transaction), 0);
    const expenseCount = filteredTransactions.filter((transaction) => transaction.type === "expense").length;

    return {
      income,
      expenses,
      balance: income - expenses,
      count: filteredTransactions.length,
      averageExpense: expenseCount === 0 ? 0 : expenses / expenseCount,
    };
  }, [filteredTransactions]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!description.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t.invalidInput);
      return;
    }

    try {
      const created = await createTransaction({
        description: description.trim(),
        amount: parsedAmount,
        type,
        category,
        date,
        currency: txCurrency,
        force: duplicateWarning?.type === "transaction" ? true : undefined,
      });
      setTransactions((previous) => [created, ...previous]);
      setDescription("");
      setAmount("");
      setType("expense");
      setCategory(defaultCategory);
      setTxCurrency(baseCurrency);
      setDate(new Date().toISOString().split("T")[0]);
      setDuplicateWarning(null);
      setError("");
    } catch (err) {
      if (err?.code === "DUPLICATE") {
        setDuplicateWarning({ type: "transaction", detail: err.duplicate });
        setError(t.duplicateTxBody);
        return;
      }
      setError(t.saveFailed);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id);
      setTransactions((previous) => previous.filter((transaction) => transaction.id !== id));
    } catch {
      setError(t.deleteFailed);
    }
  };

  const triggerReceiptUpload = () => {
    receiptInputRef.current?.click();
  };

  const triggerReceiptCamera = () => {
    receiptCameraInputRef.current?.click();
  };

  const closeReceiptModal = () => {
    if (receiptLoading) return;
    setReceiptOpen(false);
    setDuplicateWarning(null);
    setPendingReceiptFile(null);
    refreshUnsorted();
  };

  const openDraftFromReceipt = (receipt, warnings = {}) => {
    setActiveReceiptId(receipt.id);
    setReceiptParseSource(receipt.parseSource || "openai");
    setReceiptDraft({
      description: receipt.description || "",
      amount: receipt.amount != null ? String(receipt.amount) : "",
      date: receipt.date || new Date().toISOString().split("T")[0],
      category: receipt.category
        ? resolveCategoryFromParsed(receipt.category, categories)
        : defaultCategory,
      currency: receipt.currency || baseCurrency,
    });
    if (warnings.duplicateTransaction) {
      setDuplicateWarning({ type: "transaction", detail: warnings.duplicateTransaction });
    } else {
      setDuplicateWarning(null);
    }
    setReceiptOpen(true);
  };

  const uploadReceiptFile = async (file, options = {}) => {
    const { receipt, warnings } = await uploadReceipt(file, options);
    openDraftFromReceipt(receipt, warnings);
    await refreshUnsorted();
    return receipt;
  };

  const handleReceiptFile = async (event, { force = false } = {}) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      return;
    }
    setReceiptLoading(true);
    setReceiptProgress(0);
    setReceiptError("");
    setActiveReceiptId(null);
    setPendingReceiptFile(file);

    try {
      setReceiptProgress(0.35);
      await uploadReceiptFile(file, { force });
      setReceiptProgress(1);
    } catch (err) {
      if (err?.code === "DUPLICATE_RECEIPT") {
        setDuplicateWarning({ type: "receipt", detail: err.duplicateReceipt });
        setReceiptError(t.duplicateReceiptBody);
        return;
      }
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
        const parsed = { ...parseReceiptText(text), currency: baseCurrency };
        await uploadReceiptFile(file, { parsed, parseSource: "local", force });
      } catch (innerErr) {
        if (innerErr?.code === "DUPLICATE_RECEIPT") {
          setDuplicateWarning({ type: "receipt", detail: innerErr.duplicateReceipt });
          setReceiptError(t.duplicateReceiptBody);
          return;
        }
        try {
          await uploadReceiptFile(
            file,
            {
              parsed: {
                description: "",
                amount: null,
                date: new Date().toISOString().split("T")[0],
                category: defaultCategory,
                currency: baseCurrency,
              },
              parseSource: "none",
              force,
            },
          );
          setReceiptError(t.ocrError);
        } catch (finalErr) {
          setReceiptError(finalErr instanceof Error ? finalErr.message : t.ocrError);
        }
      }
    } finally {
      setReceiptLoading(false);
      setReceiptProgress(0);
    }
  };

  const handleForceDuplicateReceipt = async () => {
    if (!pendingReceiptFile) return;
    const fakeEvent = { target: { files: [pendingReceiptFile], value: "" } };
    await handleReceiptFile(fakeEvent, { force: true });
  };

  const handleReviewInboxReceipt = (receipt) => {
    setActiveReceiptId(receipt.id);
    setReceiptParseSource(receipt.parseSource || "local");
    setReceiptDraft({
      description: receipt.description || "",
      amount: receipt.amount != null ? String(receipt.amount) : "",
      date: receipt.date || new Date().toISOString().split("T")[0],
      category: receipt.category
        ? resolveCategoryFromParsed(receipt.category, categories)
        : defaultCategory,
      currency: receipt.currency || baseCurrency,
    });
    setReceiptError("");
    setDuplicateWarning(null);
    setReceiptOpen(true);
  };

  const handleDeleteInboxReceipt = async (id) => {
    setReceiptBusyId(id);
    try {
      await deleteReceipt(id);
      setUnsortedReceipts((previous) => previous.filter((item) => item.id !== id));
      if (activeReceiptId === id) {
        setReceiptOpen(false);
        setActiveReceiptId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.deleteFailed);
    } finally {
      setReceiptBusyId(null);
    }
  };

  const handleReceiptConfirm = async (force = false) => {
    const parsedAmount = Number(receiptDraft.amount);
    if (!receiptDraft.description.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setReceiptError(t.invalidInput);
      return;
    }
    setReceiptError("");
    try {
      if (activeReceiptId) {
        await updateReceiptDraft(activeReceiptId, {
          description: receiptDraft.description.trim(),
          amount: parsedAmount,
          category: receiptDraft.category,
          date: receiptDraft.date,
          currency: receiptDraft.currency,
          parseSource: receiptParseSource,
        });
        const result = await confirmReceipt(
          activeReceiptId,
          {
            description: receiptDraft.description.trim(),
            amount: parsedAmount,
            type: "expense",
            category: receiptDraft.category,
            date: receiptDraft.date,
            currency: receiptDraft.currency,
          },
          { force: force || duplicateWarning?.type === "transaction" },
        );
        setTransactions((previous) => [result.transaction, ...previous]);
        setUnsortedReceipts((previous) => previous.filter((item) => item.id !== activeReceiptId));
        setActiveReceiptId(null);
        setDuplicateWarning(null);
      } else {
        const created = await createTransaction({
          description: receiptDraft.description.trim(),
          amount: parsedAmount,
          type: "expense",
          category: receiptDraft.category,
          date: receiptDraft.date,
          currency: receiptDraft.currency,
        });
        setTransactions((previous) => [created, ...previous]);
      }
      setReceiptOpen(false);
    } catch (err) {
      if (err?.code === "DUPLICATE") {
        setDuplicateWarning({ type: "transaction", detail: err.duplicate });
        setReceiptError(t.duplicateTxBody);
        return;
      }
      setReceiptError(t.saveFailed);
    }
  };

  const handleExportExcel = async () => {
    if (filteredTransactions.length === 0) return;
    const rows = mapTransactionsForExport(filteredTransactions, t, categoryLabels);
    const stamp = new Date().toISOString().slice(0, 10);
    const userLabel = safeExportFilenamePart(user?.name || "user");
    await exportTransactionsExcel({
      rows,
      t,
      filename: `flowspend-${userLabel}-${stamp}.xlsx`,
    });
  };

  const handleExportPdf = async () => {
    if (filteredTransactions.length === 0) return;
    const rows = mapTransactionsForExport(filteredTransactions, t, categoryLabels);
    const stamp = new Date().toISOString().slice(0, 10);
    const userLabel = safeExportFilenamePart(user?.name || "user");
    await exportTransactionsPdf({
      rows,
      t,
      filename: `flowspend-${userLabel}-${stamp}.pdf`,
      formatCurrency,
      title: `${t.appTitle} · ${user?.name || "user"} · ${stamp}`,
    });
  };

  const handleExportCsvFiltered = () => {
    if (filteredTransactions.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const userLabel = safeExportFilenamePart(user?.name || "user");
    exportFilteredCsv(filteredTransactions, `flowspend-${userLabel}-${stamp}.csv`);
  };

  const handleExportCsvAll = async () => {
    try {
      await downloadAllTransactionsCsv();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.importFailed);
    }
  };

  const handleBackupJson = async () => {
    try {
      await downloadFullBackup();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.importFailed);
    }
  };

  const handleCsvImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseTransactionsCsv(text);
      if (rows.length === 0) {
        setError(t.importFailed);
        return;
      }
      const result = await bulkImportTransactions(rows);
      setTransactions(result.transactions);
      setImportMessage(t.importSuccess.replace("{count}", String(result.imported)));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.importFailed);
    }
  };

  const handleJsonRestore = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const result = await restoreFullBackup(backup);
      setTransactions(result.transactions);
      if (backup.user?.baseCurrency) {
        setBaseCurrency(backup.user.baseCurrency);
        setTxCurrency(backup.user.baseCurrency);
      }
      await refreshUnsorted();
      const parts = [
        t.importSuccess.replace("{count}", String(result.transactionsImported)),
        result.receiptsRestored ? `${result.receiptsRestored} receipts` : "",
      ].filter(Boolean);
      setImportMessage(parts.join(" · "));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.importFailed);
    }
  };

  const handleSaveSettings = async (payload) => {
    setSettingsBusy(true);
    setSettingsError("");
    try {
      const settings = await updateSettings(payload);
      setBaseCurrency(settings.baseCurrency);
      setTxCurrency(settings.baseCurrency);
      const rows = await fetchTransactions();
      setTransactions(rows);
      setSettingsOpen(false);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setSettingsBusy(false);
    }
  };

  const handleAddCategory = async (payload) => {
    setCategoryBusy(true);
    setCategoryError("");
    try {
      const created = await createCategory(payload);
      setCategories((previous) => [...previous, created].sort((a, b) => a.label.localeCompare(b.label)));
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : t.categoryFailed);
    } finally {
      setCategoryBusy(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    setCategoryBusy(true);
    setCategoryError("");
    try {
      await deleteCategory(id);
      setCategories((previous) => previous.filter((item) => item.id !== id));
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : t.categoryFailed);
    } finally {
      setCategoryBusy(false);
    }
  };

  if (authLoading) {
    return <div className="auth-loading">{t.loadingData}</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

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
      <input
        ref={receiptCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        aria-hidden
        tabIndex={-1}
        onChange={handleReceiptFile}
      />
      <input
        ref={csvImportRef}
        type="file"
        accept=".csv,text/csv"
        className="visually-hidden-input"
        tabIndex={-1}
        onChange={handleCsvImport}
      />
      <input
        ref={jsonImportRef}
        type="file"
        accept=".json,application/json"
        className="visually-hidden-input"
        tabIndex={-1}
        onChange={handleJsonRestore}
      />

      <CategoryManager
        open={categoryOpen}
        onClose={() => {
          setCategoryOpen(false);
          setCategoryError("");
        }}
        categories={categories}
        onAdd={handleAddCategory}
        onDelete={handleDeleteCategory}
        t={t}
        busy={categoryBusy}
        error={categoryError}
      />

      <SettingsModal
        key={settingsOpen ? baseCurrency : "closed"}
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          setSettingsError("");
        }}
        settings={{ baseCurrency }}
        currencies={supportedCurrencies}
        onSave={handleSaveSettings}
        t={t}
        busy={settingsBusy}
        error={settingsError}
      />

      <ReceiptScanModal
        open={receiptOpen}
        onClose={closeReceiptModal}
        draft={receiptDraft}
        onChangeDraft={setReceiptDraft}
        onConfirm={() => handleReceiptConfirm(false)}
        onConfirmForce={() => handleReceiptConfirm(true)}
        loading={receiptLoading}
        progress={receiptProgress}
        error={receiptError}
        duplicateWarning={duplicateWarning}
        t={t}
        categories={categories.map((item) => ({
          slug: item.slug,
          label: categoryLabels[item.slug] ?? item.label,
        }))}
        currencies={supportedCurrencies}
        previewUrl={activeReceiptId ? receiptImageUrl(activeReceiptId) : null}
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

      <div className="user-bar">
        <span className="user-bar-label">{t.signedInAs}</span>
        <span className="user-bar-name">{user.name}</span>
        <span className="user-bar-email">{user.email}</span>
        <button type="button" className="data-actions-btn" onClick={() => setSettingsOpen(true)}>
          {t.settingsTitle}
        </button>
        <button type="button" className="data-actions-btn" onClick={() => setCategoryOpen(true)}>
          {t.manageCategories}
        </button>
        <button type="button" className="logout-btn" onClick={() => logout()}>
          {t.logout}
        </button>
      </div>

      <div className="data-actions">
        <button type="button" className="data-actions-btn" onClick={() => csvImportRef.current?.click()}>
          {t.importCsv}
        </button>
        <button type="button" className="data-actions-btn" onClick={handleBackupJson}>
          {t.backupFull}
        </button>
        <button type="button" className="data-actions-btn" onClick={() => jsonImportRef.current?.click()}>
          {t.restoreJson}
        </button>
        <button type="button" className="data-actions-btn" onClick={handleExportCsvAll} disabled={transactions.length === 0}>
          {t.exportCsvAll}
        </button>
      </div>

      {duplicateWarning?.type === "receipt" && !receiptOpen ? (
        <div className="duplicate-banner">
          <strong>{t.duplicateReceiptTitle}</strong>
          <span>{t.duplicateReceiptBody}</span>
          <div className="duplicate-actions">
            <button type="button" className="duplicate-force-btn" onClick={handleForceDuplicateReceipt}>
              {t.saveAnyway}
            </button>
            <button type="button" className="duplicate-dismiss-btn" onClick={() => setDuplicateWarning(null)}>
              {t.cancel}
            </button>
          </div>
        </div>
      ) : null}

      {importMessage ? <p className="empty-state">{importMessage}</p> : null}

      <UnsortedInbox
        receipts={unsortedReceipts}
        t={t}
        formatCurrency={formatCurrency}
        categoryLabels={categoryLabels}
        onReview={handleReviewInboxReceipt}
        onDelete={handleDeleteInboxReceipt}
        busyId={receiptBusyId}
      />

      {dataLoading ? <p className="empty-state">{t.loadingData}</p> : null}

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
          <div className="scan-actions">
            <button
              type="button"
              className="scan-receipt-btn scan-camera-btn"
              onClick={triggerReceiptCamera}
              disabled={receiptLoading}
              aria-label={t.scanReceiptCamera}
            >
              {receiptLoading ? t.scanning : t.scanReceiptCamera}
            </button>
            <button
              type="button"
              className="scan-receipt-btn scan-upload-btn"
              onClick={triggerReceiptUpload}
              disabled={receiptLoading}
              aria-label={t.scanReceiptUpload}
            >
              {receiptLoading ? t.scanning : t.scanReceiptUpload}
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder={t.description} value={description} onChange={(e) => setDescription(e.target.value)} />
          <input type="number" placeholder={t.amount} value={amount} min="0" step="0.01" onChange={(e) => setAmount(e.target.value)} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="income">{t.incomeType}</option>
            <option value="expense">{t.expenseType}</option>
          </select>
          <select value={txCurrency} onChange={(e) => setTxCurrency(e.target.value)}>
            {supportedCurrencies.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code}
              </option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {categoryLabels[item.slug] ?? item.label}
              </option>
            ))}
          </select>
          <button type="submit">{t.add}</button>
        </form>
        {duplicateWarning?.type === "transaction" && !receiptOpen ? (
          <div className="duplicate-banner">
            <strong>{t.duplicateTxTitle}</strong>
            <span>{t.duplicateTxBody}</span>
            <div className="duplicate-actions">
              <button
                type="button"
                className="duplicate-force-btn"
                onClick={() => handleSubmit({ preventDefault: () => {} })}
              >
                {t.saveAnyway}
              </button>
              <button type="button" className="duplicate-dismiss-btn" onClick={() => setDuplicateWarning(null)}>
                {t.cancel}
              </button>
            </div>
          </div>
        ) : null}
        {error ? <p className="error-message">{error}</p> : null}
      </div>

      <div className="transactions">
        <div className="transactions-toolbar">
          <h2>{t.txCount}</h2>
          <div className="export-actions">
            <span className="export-hint">{t.exportHint}</span>
            <button
              type="button"
              className="export-btn export-btn-csv"
              disabled={filteredTransactions.length === 0}
              onClick={handleExportCsvFiltered}
            >
              {t.exportCsvFiltered}
            </button>
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
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {categoryLabels[item.slug] ?? item.label}
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
                  <th>{t.receiptColumn}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.date}</td>
                    <td>{transaction.description}</td>
                    <td>{categoryLabels[transaction.category] ?? transaction.category}</td>
                    <td className="capitalize">{transaction.type === "income" ? t.incomeType : t.expenseType}</td>
                    <td className={transaction.type === "income" ? "income-value" : "expense-value"}>
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transactionAmountBase(transaction))}
                      {transaction.currency && transaction.currency !== baseCurrency ? (
                        <span className="currency-note">
                          {" "}
                          ({formatMoney(transaction.amount, transaction.currency, locale)})
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {transaction.receiptId ? (
                        <a
                          className="receipt-link-btn"
                          href={receiptImageUrl(transaction.receiptId)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t.viewReceipt}
                        </a>
                      ) : (
                        "—"
                      )}
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
