"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Expense = {
  id: string;
  name: string;
  amount: number;
  paidBy: string;
  category: string;
};

type Group = {
  id: string;
  name: string;
  members: string[];
  expenses: Expense[];
};

type Settlement = {
  from: string;
  to: string;
  amount: number;
};

type CategoryStat = {
  category: string;
  total: number;
  percentage: number;
};

const STORAGE_KEY = "splitwise-groups";
const THEME_KEY = "splitwise-theme";

const CATEGORIES = [
  "🍔 Food",
  "🚕 Travel",
  "🏠 Rent",
  "🎬 Entertainment",
  "🛒 Shopping",
  "💡 Bills",
  "🩺 Medical",
  "📦 Other",
];

const DEFAULT_CATEGORY = "📦 Other";

const CHART_COLORS = [
  "#3b82f6",
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#ec4899",
  "#eab308",
  "#ef4444",
  "#6b7280",
];

export default function Home() {
  const [groupName, setGroupName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");

  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setGroups(parsedData);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    } catch (error) {
      console.error("Failed to save data to localStorage:", error);
    }
  }, [groups, isLoaded]);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "dark") {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleCreateGroup = () => {
    const trimmedName = groupName.trim();

    if (trimmedName === "") {
      alert("Please enter a group name.");
      return;
    }

    const alreadyExists = groups.some(
      (group) => group.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (alreadyExists) {
      alert("Group already exists.");
      return;
    }

    const newGroup: Group = {
      id: crypto.randomUUID(),
      name: trimmedName,
      members: [],
      expenses: [],
    };

    setGroups([...groups, newGroup]);
    setGroupName("");
    alert("Group created successfully!");
  };

  const handleDeleteGroup = (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this group?"
    );
    if (!confirmed) return;
    setGroups(groups.filter((group) => group.id !== id));
  };

  const handleOpenGroup = (id: string) => {
    setSelectedGroupId(id);
    setMemberName("");
    setExpenseName("");
    setExpenseAmount("");
    setPaidBy("");
    setExpenseCategory("");
    setEditingExpenseId(null);
  };

  const handleBack = () => {
    setSelectedGroupId(null);
    setMemberName("");
    setExpenseName("");
    setExpenseAmount("");
    setPaidBy("");
    setExpenseCategory("");
    setEditingExpenseId(null);
  };

  const handleAddMember = () => {
    const trimmedName = memberName.trim();

    if (trimmedName === "") {
      alert("Please enter a member name.");
      return;
    }

    const selectedGroup = groups.find((group) => group.id === selectedGroupId);
    if (!selectedGroup) return;

    const alreadyExists = selectedGroup.members.some(
      (member) => member.toLowerCase() === trimmedName.toLowerCase()
    );

    if (alreadyExists) {
      alert("Member already exists.");
      return;
    }

    setGroups(
      groups.map((group) =>
        group.id === selectedGroupId
          ? { ...group, members: [...group.members, trimmedName] }
          : group
      )
    );

    setMemberName("");
  };

  const handleDeleteMember = (memberToDelete: string) => {
    const selectedGroup = groups.find((group) => group.id === selectedGroupId);
    if (!selectedGroup) return;

    const hasExpenses = selectedGroup.expenses.some(
      (expense) => expense.paidBy === memberToDelete
    );

    if (hasExpenses) {
      alert("This member has expenses. Delete or edit those expenses first.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this member?"
    );
    if (!confirmed) return;

    setGroups(
      groups.map((group) =>
        group.id === selectedGroupId
          ? {
              ...group,
              members: group.members.filter(
                (member) => member !== memberToDelete
              ),
            }
          : group
      )
    );

    if (paidBy === memberToDelete) {
      setPaidBy("");
    }
  };

  const handleAddExpense = () => {
    const trimmedName = expenseName.trim();
    const amountNumber = parseFloat(expenseAmount);

    if (trimmedName === "") {
      alert("Please enter an expense name.");
      return;
    }

    if (isNaN(amountNumber) || amountNumber <= 0) {
      alert("Please enter a valid amount greater than 0.");
      return;
    }

    if (paidBy === "") {
      alert("Please select who paid.");
      return;
    }

    if (expenseCategory === "") {
      alert("Please select a category.");
      return;
    }

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      name: trimmedName,
      amount: amountNumber,
      paidBy: paidBy,
      category: expenseCategory,
    };

    setGroups(
      groups.map((group) =>
        group.id === selectedGroupId
          ? { ...group, expenses: [...group.expenses, newExpense] }
          : group
      )
    );

    setExpenseName("");
    setExpenseAmount("");
    setPaidBy("");
    setExpenseCategory("");
  };

  const handleStartEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setExpenseName(expense.name);
    setExpenseAmount(expense.amount.toString());
    setPaidBy(expense.paidBy);
    setExpenseCategory(expense.category || DEFAULT_CATEGORY);
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setExpenseName("");
    setExpenseAmount("");
    setPaidBy("");
    setExpenseCategory("");
  };

  const handleUpdateExpense = () => {
    const trimmedName = expenseName.trim();
    const amountNumber = parseFloat(expenseAmount);

    if (trimmedName === "") {
      alert("Please enter an expense name.");
      return;
    }

    if (isNaN(amountNumber) || amountNumber <= 0) {
      alert("Please enter a valid amount greater than 0.");
      return;
    }

    if (paidBy === "") {
      alert("Please select who paid.");
      return;
    }

    if (expenseCategory === "") {
      alert("Please select a category.");
      return;
    }

    setGroups(
      groups.map((group) =>
        group.id === selectedGroupId
          ? {
              ...group,
              expenses: group.expenses.map((expense) =>
                expense.id === editingExpenseId
                  ? {
                      ...expense,
                      name: trimmedName,
                      amount: amountNumber,
                      paidBy: paidBy,
                      category: expenseCategory,
                    }
                  : expense
              ),
            }
          : group
      )
    );

    setEditingExpenseId(null);
    setExpenseName("");
    setExpenseAmount("");
    setPaidBy("");
    setExpenseCategory("");
  };

  const handleDeleteExpense = (expenseId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?"
    );
    if (!confirmed) return;

    setGroups(
      groups.map((group) =>
        group.id === selectedGroupId
          ? {
              ...group,
              expenses: group.expenses.filter(
                (expense) => expense.id !== expenseId
              ),
            }
          : group
      )
    );

    if (editingExpenseId === expenseId) {
      handleCancelEdit();
    }
  };

  const selectedGroup = groups.find((group) => group.id === selectedGroupId);

  const totalExpenses = selectedGroup
    ? selectedGroup.expenses.reduce((sum, expense) => sum + expense.amount, 0)
    : 0;

  const memberCount = selectedGroup ? selectedGroup.members.length : 0;

  const amountPerMember = memberCount > 0 ? totalExpenses / memberCount : 0;

  const paidByMember: Record<string, number> = {};
  if (selectedGroup) {
    selectedGroup.members.forEach((member) => {
      paidByMember[member] = 0;
    });
    selectedGroup.expenses.forEach((expense) => {
      paidByMember[expense.paidBy] =
        (paidByMember[expense.paidBy] || 0) + expense.amount;
    });
  }

  const balances: { member: string; balance: number }[] = selectedGroup
    ? selectedGroup.members.map((member) => ({
        member,
        balance: (paidByMember[member] || 0) - amountPerMember,
      }))
    : [];

  const settlements: Settlement[] = [];
  if (selectedGroup && selectedGroup.expenses.length > 0) {
    const creditors = balances
      .filter((b) => b.balance > 0.01)
      .map((b) => ({ ...b }))
      .sort((a, b) => b.balance - a.balance);

    const debtors = balances
      .filter((b) => b.balance < -0.01)
      .map((b) => ({ ...b, balance: Math.abs(b.balance) }))
      .sort((a, b) => b.balance - a.balance);

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.balance, creditor.balance);

      if (amount > 0.01) {
        settlements.push({
          from: debtor.member,
          to: creditor.member,
          amount: amount,
        });
      }

      debtor.balance -= amount;
      creditor.balance -= amount;

      if (debtor.balance < 0.01) i++;
      if (creditor.balance < 0.01) j++;
    }
  }

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const categoryStats: CategoryStat[] = (() => {
    if (!selectedGroup || selectedGroup.expenses.length === 0) return [];

    const totalsByCategory: Record<string, number> = {};
    selectedGroup.expenses.forEach((expense) => {
      const category = expense.category || DEFAULT_CATEGORY;
      totalsByCategory[category] =
        (totalsByCategory[category] || 0) + expense.amount;
    });

    return Object.entries(totalsByCategory).map(([category, total]) => ({
      category,
      total,
      percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
    }));
  })();

  const handleExportPdf = () => {
    if (!selectedGroup) return;

    const doc = new jsPDF();
    let cursorY = 20;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(selectedGroup.name, 14, cursorY);
    cursorY += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, cursorY);
    doc.setTextColor(0);
    cursorY += 10;

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Members", 14, cursorY);
    cursorY += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (selectedGroup.members.length === 0) {
      doc.text("No members.", 14, cursorY);
      cursorY += 6;
    } else {
      doc.text(selectedGroup.members.join(", "), 14, cursorY);
      cursorY += 8;
    }

    cursorY += 4;

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Expenses", 14, cursorY);
    cursorY += 4;

    if (selectedGroup.expenses.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("No expenses recorded.", 14, cursorY + 6);
      cursorY += 14;
    } else {
      autoTable(doc, {
        startY: cursorY + 2,
        head: [["Name", "Category", "Amount (₹)", "Paid By"]],
        body: selectedGroup.expenses.map((expense) => [
          expense.name,
          expense.category || DEFAULT_CATEGORY,
          expense.amount.toFixed(2),
          expense.paidBy,
        ]),
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });

      cursorY = (doc as any).lastAutoTable.finalY + 10;
    }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, cursorY);
    cursorY += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Expenses: Rs. ${totalExpenses.toFixed(2)}`, 14, cursorY);
    cursorY += 6;
    doc.text(`Total Members: ${memberCount}`, 14, cursorY);
    cursorY += 6;
    doc.text(
      `Equal Share Per Member: Rs. ${
        memberCount > 0 ? amountPerMember.toFixed(2) : "0.00"
      }`,
      14,
      cursorY
    );
    cursorY += 10;

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Settle Up", 14, cursorY);
    cursorY += 4;

    if (settlements.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Everyone is settled up.", 14, cursorY + 6);
    } else {
      autoTable(doc, {
        startY: cursorY + 2,
        head: [["From", "To", "Amount (₹)"]],
        body: settlements.map((settlement) => [
          settlement.from,
          settlement.to,
          settlement.amount.toFixed(2),
        ]),
        theme: "striped",
        headStyles: { fillColor: [249, 115, 22] },
        styles: { fontSize: 9 },
      });
    }

    const safeName = selectedGroup.name.replace(/\s+/g, "_");
    doc.save(`${safeName}_expense_report.pdf`);
  };

  // NEW: Dark Mode toggle — smaller/tighter on very small screens via responsive padding
  const DarkModeToggle = (
    <button
      onClick={handleToggleDarkMode}
      aria-label="Toggle dark mode"
      className="fixed top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <span className="relative inline-block w-9 h-5 sm:w-10 sm:h-5 rounded-full bg-gray-300 dark:bg-gray-600 transition-colors duration-300">
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
            isDarkMode ? "translate-x-4 sm:translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
      <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-200">
        {isDarkMode ? "🌙" : "☀️"}
      </span>
    </button>
  );

  if (selectedGroup) {
    return (
      // CHANGED: overflow-x-hidden prevents horizontal scroll on small screens.
      // Padding and top-spacing now scale with screen size (px-4 → sm:px-6 → lg:px-8).
      <main className="flex min-h-screen flex-col items-center overflow-x-hidden pt-16 sm:pt-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 transition-colors duration-300">
        {DarkModeToggle}
        {/* CHANGED: container width now grows on larger screens instead of staying fixed at max-w-md */}
        <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl space-y-4">
          <button
            onClick={handleBack}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to groups
          </button>

          {/* CHANGED: heading scales up on larger screens */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-gray-900 dark:text-gray-100 break-words">
            {selectedGroup.name}
          </h1>

          <input
            type="text"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder="Enter member name"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleAddMember}
            className="w-full bg-blue-600 dark:bg-blue-700 text-white rounded-md py-2 sm:py-2.5 text-sm sm:text-base font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition"
          >
            Add Member
          </button>

          <div className="mt-4">
            <h2 className="text-base sm:text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">
              Members
            </h2>
            {selectedGroup.members.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No members yet.
              </p>
            ) : (
              // CHANGED: On mobile, use a 1-column grid; from sm upward, a 2-column grid
              // so the members list doesn't turn into one long column on wider screens.
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedGroup.members.map((member, index) => (
                  <li
                    key={index}
                    // CHANGED: flex-wrap + gap so the Delete button drops below the name
                    // instead of overflowing on very narrow screens
                    className="flex flex-wrap items-center justify-between gap-2 bg-gray-100 dark:bg-gray-800 rounded-md px-3 py-2 sm:px-4 text-sm sm:text-base text-gray-800 dark:text-gray-100"
                  >
                    <span className="truncate">👤 {member}</span>
                    <button
                      onClick={() => handleDeleteMember(member)}
                      className="bg-red-600 dark:bg-red-700 text-white text-xs sm:text-sm rounded-md px-3 py-1 hover:bg-red-700 dark:hover:bg-red-600 transition shrink-0"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 space-y-3">
            <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">
              {editingExpenseId ? "Edit Expense" : "Add Expense"}
            </h2>

            {/* CHANGED: form fields stack on mobile, sit side-by-side from md upward */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                placeholder="Expense name (e.g. Dinner)"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="Amount (e.g. 500)"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select who paid --</option>
                {selectedGroup.members.map((member, index) => (
                  <option key={index} value={member}>
                    {member}
                  </option>
                ))}
              </select>

              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select category --</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* CHANGED: buttons stack on mobile, sit side-by-side from sm upward, with flex-wrap as a safety net */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={editingExpenseId ? handleUpdateExpense : handleAddExpense}
                disabled={selectedGroup.members.length === 0}
                className="flex-1 min-w-[140px] bg-green-600 dark:bg-green-700 text-white rounded-md py-2 sm:py-2.5 text-sm sm:text-base font-medium hover:bg-green-700 dark:hover:bg-green-600 transition disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
              >
                {editingExpenseId ? "Update Expense" : "Add Expense"}
              </button>

              {editingExpenseId && (
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 min-w-[100px] bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md py-2 sm:py-2.5 text-sm sm:text-base font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              )}
            </div>

            {selectedGroup.members.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add at least one member before adding an expense.
              </p>
            )}
          </div>

          <div className="mt-4">
            <h2 className="text-base sm:text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">
              Expenses
            </h2>
            {selectedGroup.expenses.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No expenses yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedGroup.expenses.map((expense) => (
                  <li
                    key={expense.id}
                    // CHANGED: stacks vertically on mobile (name/category/amount on top,
                    // buttons below), sits side-by-side from sm upward
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-100 dark:bg-gray-800 rounded-md px-3 py-2 sm:px-4 text-gray-800 dark:text-gray-100"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm sm:text-base break-words">
                        {expense.name}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        Category: {expense.category || DEFAULT_CATEGORY}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        ₹{expense.amount.toFixed(2)} — paid by {expense.paidBy}
                      </span>
                    </div>
                    {/* CHANGED: buttons wrap and align to the start on mobile so they
                        never get squeezed off-screen next to long expense names */}
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        onClick={() => handleStartEditExpense(expense)}
                        className="bg-blue-600 dark:bg-blue-700 text-white text-xs sm:text-sm rounded-md px-3 py-1 hover:bg-blue-700 dark:hover:bg-blue-600 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="bg-red-600 dark:bg-red-700 text-white text-xs sm:text-sm rounded-md px-3 py-1 hover:bg-red-700 dark:hover:bg-red-600 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-base sm:text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">
              Summary
            </h2>

            {selectedGroup.expenses.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Add expenses to see the split summary.
              </p>
            ) : (
              <div className="bg-blue-50 dark:bg-gray-800 rounded-md p-3 sm:p-4 space-y-3">
                {/* CHANGED: each summary row wraps instead of overflowing on narrow screens */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-sm sm:text-base">
                  <span className="text-gray-700 dark:text-gray-300">
                    Total Expenses
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    ₹{totalExpenses.toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1 text-sm sm:text-base">
                  <span className="text-gray-700 dark:text-gray-300">
                    Total Members
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {memberCount}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1 border-t border-blue-200 dark:border-gray-700 pt-3 text-sm sm:text-base">
                  <span className="text-gray-700 dark:text-gray-300">
                    Each Member Owes (Equal Split)
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {memberCount > 0
                      ? `₹${amountPerMember.toFixed(2)}`
                      : "No members yet"}
                  </span>
                </div>

                <div className="border-t border-blue-200 dark:border-gray-700 pt-3">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Each member&apos;s equal share:
                  </p>
                  <ul className="space-y-1">
                    {selectedGroup.members.map((member, index) => (
                      <li
                        key={index}
                        className="flex flex-wrap items-center justify-between gap-1 text-xs sm:text-sm"
                      >
                        <span className="text-gray-800 dark:text-gray-200">
                          👤 {member}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          ₹{amountPerMember.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={handleExportPdf}
                  className="w-full bg-purple-600 dark:bg-purple-700 text-white rounded-md py-2 sm:py-2.5 text-sm sm:text-base font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition mt-2"
                >
                  📄 Export PDF
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-base sm:text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">
              Analytics
            </h2>

            {categoryStats.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No analytics available.
              </p>
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 sm:p-4 space-y-2">
                  {categoryStats.map((stat, index) => (
                    <div
                      key={stat.category}
                      className="flex flex-wrap items-center justify-between gap-1 text-xs sm:text-sm"
                    >
                      <span className="text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                        {stat.category}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        ₹{stat.total.toFixed(2)} ({stat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>

                {/* CHANGED: charts already used ResponsiveContainer, so they scale with
                    their parent automatically. Height is slightly smaller on mobile
                    via a responsive wrapper class so charts don't dominate small screens. */}
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Spending by Category (Pie Chart)
                  </p>
                  <div className="w-full h-56 sm:h-64 md:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryStats}
                          dataKey="total"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={(entry) => `${entry.percentage.toFixed(0)}%`}
                        >
                          {categoryStats.map((stat, index) => (
                            <Cell
                              key={stat.category}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `₹${value.toFixed(2)}`}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Spending by Category (Bar Chart)
                  </p>
                  <div className="w-full h-56 sm:h-64 md:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryStats}>
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 9 }}
                          interval={0}
                          angle={-25}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip
                          formatter={(value: number) => `₹${value.toFixed(2)}`}
                        />
                        <Bar dataKey="total">
                          {categoryStats.map((stat, index) => (
                            <Cell
                              key={stat.category}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-base sm:text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">
              Settle Up
            </h2>

            {selectedGroup.expenses.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Add expenses to see who owes whom.
              </p>
            ) : settlements.length === 0 ? (
              <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-md p-3">
                Everyone is settled up! 🎉
              </p>
            ) : (
              <div className="bg-orange-50 dark:bg-gray-800 rounded-md p-3 sm:p-4 space-y-2">
                {settlements.map((settlement, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center justify-between gap-1 text-xs sm:text-sm"
                  >
                    <span className="text-gray-800 dark:text-gray-200">
                      <span className="font-medium">{settlement.from}</span>{" "}
                      pays{" "}
                      <span className="font-medium">{settlement.to}</span>
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      ₹{settlement.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-hidden pt-16 sm:pt-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 transition-colors duration-300">
      {DarkModeToggle}
      <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl space-y-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-gray-900 dark:text-gray-100">
          Create a Group
        </h1>

        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Enter group name"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleCreateGroup}
          className="w-full bg-blue-600 dark:bg-blue-700 text-white rounded-md py-2 sm:py-2.5 text-sm sm:text-base font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition"
        >
          Create Group
        </button>

        {groups.length > 0 && (
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search groups..."
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}

        {groups.length > 0 && (
          <div className="mt-6">
            <h2 className="text-base sm:text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">
              Your Groups
            </h2>

            {filteredGroups.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No matching groups found.
              </p>
            ) : (
              // CHANGED: 1 column on mobile, 2 columns from sm upward — makes better
              // use of extra width on tablets/desktops without changing behavior
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredGroups.map((group) => (
                  <li
                    key={group.id}
                    className="flex flex-wrap items-center justify-between gap-2 bg-gray-100 dark:bg-gray-800 rounded-md px-3 py-2 sm:px-4 text-sm sm:text-base text-gray-800 dark:text-gray-100"
                  >
                    <button
                      onClick={() => handleOpenGroup(group.id)}
                      className="hover:underline text-left truncate"
                    >
                      {group.name}
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="bg-red-600 dark:bg-red-700 text-white text-xs sm:text-sm rounded-md px-3 py-1 hover:bg-red-700 dark:hover:bg-red-600 transition shrink-0"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}