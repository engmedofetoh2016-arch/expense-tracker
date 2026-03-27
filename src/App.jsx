import { useEffect, useMemo, useState } from "react";
import "./App.css";

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
    appTitle: "Finance Tracker",
    subtitle: "Track your income and expenses with smart filters",
    language: "العربية",
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
    appTitle: "متتبع المصروفات",
    subtitle: "تابع الدخل والمصروفات مع فلاتر ذكية",
    language: "English",
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

  return (
    <div className={`app ${dir}`} dir={dir}>
      <div className="top-bar">
        <div>
          <h1>{t.appTitle}</h1>
          <p className="subtitle">{t.subtitle}</p>
        </div>
        <div className="top-actions">
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
          onChange={(event) => setUserInput(event.target.value)}
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

      <div className="add-transaction">
        <h2>{t.addTransaction}</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder={t.description} value={description} onChange={(event) => setDescription(event.target.value)} />
          <input type="number" placeholder={t.amount} value={amount} min="0" step="0.01" onChange={(event) => setAmount(event.target.value)} />
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="income">{t.incomeType}</option>
            <option value="expense">{t.expenseType}</option>
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
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
        <h2>{t.txCount}</h2>
        <div className="filters advanced-filters">
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="all">{t.allTime}</option>
            <option value="weekly">{t.weekly}</option>
            <option value="monthly">{t.monthly}</option>
            <option value="yearly">{t.yearly}</option>
          </select>
          <select value={filterType} onChange={(event) => setFilterType(event.target.value)}>
            <option value="all">{t.allTypes}</option>
            <option value="income">{t.incomeType}</option>
            <option value="expense">{t.expenseType}</option>
          </select>
          <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
            <option value="all">{t.allCategories}</option>
            {categories.map((currentCategory) => (
              <option key={currentCategory} value={currentCategory}>
                {t.categories[currentCategory]}
              </option>
            ))}
          </select>
          <input type="text" placeholder={t.searchPlaceholder} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="latest">{t.latest}</option>
            <option value="oldest">{t.oldest}</option>
            <option value="amountHigh">{t.amountHigh}</option>
            <option value="amountLow">{t.amountLow}</option>
          </select>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label={t.from} />
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label={t.to} />
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
