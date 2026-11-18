"use client";

import { useState } from "react";

interface LedgerEntry {
  id: number;
  type: "수입" | "지출";
  date: string;
  amount: string;
  memo: string;
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  
  // 새 입력 폼 상태
  const [type, setType] = useState<"수입" | "지출">("지출");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  // 일자별 보기(필터) 상태
  const [filterDate, setFilterDate] = useState("");

  // 수정(Edit) 상태
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editType, setEditType] = useState<"수입" | "지출">("지출");
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editMemo, setEditMemo] = useState("");

  // 내역 추가
  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amount || !memo) return;

    const newEntry: LedgerEntry = {
      id: Date.now(),
      type,
      date,
      amount,
      memo,
    };
    // 최신 항목이 위로 오도록 배열 합치기
    setEntries([newEntry, ...entries]);
    setAmount("");
    setMemo("");
  };

  // 내역 삭제
  const handleDelete = (id: number) => {
    if (confirm("이 내역을 정말 삭제하시겠습니까?")) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  // 내역 수정 시작
  const startEdit = (entry: LedgerEntry) => {
    setEditingId(entry.id);
    setEditType(entry.type);
    setEditDate(entry.date);
    setEditAmount(entry.amount);
    setEditMemo(entry.memo);
  };

  // 내역 수정 저장
  const saveEdit = (id: number) => {
    setEntries(entries.map(entry => 
      entry.id === id 
        ? { ...entry, type: editType, date: editDate, amount: editAmount, memo: editMemo }
        : entry
    ));
    setEditingId(null); // 수정 모드 종료
  };

  // 날짜 필터링 적용
  const filteredEntries = filterDate 
    ? entries.filter(entry => entry.date === filterDate)
    : entries;

  // 화면에 보이는 내역 기준 합계 계산
  const totalIncome = filteredEntries.filter(e => e.type === "수입").reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalExpense = filteredEntries.filter(e => e.type === "지출").reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
      <h1 className="text-3xl font-bold text-gray-900">나의 가계부</h1>
      
      {/* 1. 요약 카드 (필터링된 날짜 기준으로 변동) */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-blue-50 p-4 rounded-xl">
          <p className="text-sm text-blue-600 font-semibold">수입 합계</p>
          <p className="text-xl font-bold text-blue-800">{totalIncome.toLocaleString()}원</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl">
          <p className="text-sm text-red-600 font-semibold">지출 합계</p>
          <p className="text-xl font-bold text-red-800">{totalExpense.toLocaleString()}원</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl">
          <p className="text-sm text-gray-600 font-semibold">잔액 계산</p>
          <p className="text-xl font-bold text-gray-800">{(totalIncome - totalExpense).toLocaleString()}원</p>
        </div>
      </div>

      {/* 2. 신규 내역 입력 폼 */}
      <form onSubmit={handleAddEntry} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="font-bold text-gray-700 mb-2">새로운 내역 추가</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select value={type} onChange={(e) => setType(e.target.value as "수입" | "지출")} className="border p-2 rounded-lg">
            <option value="수입">수입</option>
            <option value="지출">지출</option>
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border p-2 rounded-lg" required />
          <input type="number" placeholder="금액 (원)" value={amount} onChange={(e) => setAmount(e.target.value)} className="border p-2 rounded-lg" required />
          <input type="text" placeholder="내용 (예: 식비)" value={memo} onChange={(e) => setMemo(e.target.value)} className="border p-2 rounded-lg" required />
        </div>
        <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition">
          내역 등록하기
        </button>
      </form>

      {/* 3. 일자별 보기(필터) 및 리스트 영역 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* 날짜 필터 툴바 */}
        <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-gray-700">입력된 내역</h2>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 font-semibold">일자별 보기 :</label>
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)} 
              className="border p-1.5 rounded-md text-sm"
            />
            {filterDate && (
              <button onClick={() => setFilterDate("")} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1.5 rounded-md font-bold text-gray-700">
                전체보기
              </button>
            )}
          </div>
        </div>

        {/* 내역 리스트 출력 */}
        <ul className="divide-y divide-gray-200">
          {filteredEntries.map((entry) => (
            <li key={entry.id} className="p-4 hover:bg-gray-50">
              
              {/* 수정 모드일 때 보여줄 화면 */}
              {editingId === entry.id ? (
                <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 items-center">
                  <select value={editType} onChange={(e) => setEditType(e.target.value as "수입"|"지출")} className="border p-1.5 rounded w-full md:w-auto">
                    <option value="수입">수입</option>
                    <option value="지출">지출</option>
                  </select>
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="border p-1.5 rounded w-full md:w-auto" />
                  <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="border p-1.5 rounded w-full md:w-auto" />
                  <input type="text" value={editMemo} onChange={(e) => setEditMemo(e.target.value)} className="border p-1.5 rounded w-full md:w-full" />
                  <div className="flex space-x-1 w-full md:w-auto justify-end">
                    <button onClick={() => saveEdit(entry.id)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap">저장</button>
                    <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap">취소</button>
                  </div>
                </div>
              ) : (
                
                // 일반 보기 모드일 때 보여줄 화면
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${entry.type === '수입' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                      {entry.type}
                    </span>
                    <span className="text-gray-500 text-sm font-medium">{entry.date}</span>
                    <span className="font-semibold text-gray-900">{entry.memo}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`font-bold ${entry.type === '수입' ? 'text-blue-600' : 'text-red-600'}`}>
                      {entry.type === '수입' ? '+' : '-'}{Number(entry.amount).toLocaleString()}원
                    </span>
                    <div className="flex space-x-2">
                      <button onClick={() => startEdit(entry)} className="text-sm text-gray-500 hover:text-blue-600 font-semibold">수정</button>
                      <button onClick={() => handleDelete(entry.id)} className="text-sm text-gray-500 hover:text-red-600 font-semibold">삭제</button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
          {filteredEntries.length === 0 && (
            <li className="p-10 text-center text-gray-500 font-medium">
              {filterDate ? "선택한 날짜에 입력된 내역이 없습니다." : "입력된 내역이 없습니다."}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
