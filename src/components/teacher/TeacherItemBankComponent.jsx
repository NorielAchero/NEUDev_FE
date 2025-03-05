import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import "../../style/teacher/activityItems.css";
import { ProfilePlaygroundNavbarComponent } from "../ProfilePlaygroundNavbarComponent.jsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown, faCaretUp, faEllipsisV, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

// ----- Import your API functions -----
// Notice that we now import getItems (which appends query parameters) instead of getItemsByItemType.
import {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  getItemTypes,
  getProgrammingLanguages,
  verifyPassword
} from "../api/API.js";

/**
 * Optional language -> icon mapping
 */
const programmingLanguageMap = {
  Java:   { name: "Java",   image: "/src/assets/java2.png" },
  "C#":   { name: "C#",     image: "/src/assets/c.png" },
  Python: { name: "Python", image: "/src/assets/py.png" },
};

/**
 * Format date from ISO string to "MM/DD/YYYY, hh:mmAM/PM"
 */
function formatDateTime(isoString) {
  if (!isoString) return "-";
  const dateObj = new Date(isoString);
  const options = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  let localStr = dateObj.toLocaleString("en-US", options);
  localStr = localStr.replace(/\s(AM|PM)$/, "$1");
  return localStr;
}

/**
 * language ID -> short code for the compiler
 */
const compilerCodeMap = {
  1: "java",
  2: "cs",
  3: "py",
};

/**
 * Basic code validation patterns
 */
const codeValidationPatterns = {
  Java: /\b(public\s+class\s+\w+|System\.out\.println|import\s+java\.)\b/,
  Python: /\b(print\s*\(|def\s+\w+\(|import\s+\w+|class\s+\w+|for\s+\w+\s+in|while\s+|if\s+)/,
  "C#": /\b(using\s+System;|namespace\s+\w+|Console\.WriteLine)\b/
};

function isValidCodeForLanguage(code, languageName) {
  const pattern = codeValidationPatterns[languageName];
  if (!pattern) return true;
  return pattern.test(code.trim());
}

/**
 * Helper functions to determine which timestamp to display:
 * If updated_at exists and is different from created_at, we assume the item was updated.
 */
function getDisplayTimestamp(item) {
  return item.updated_at && item.updated_at !== item.created_at
    ? new Date(item.updated_at)
    : new Date(item.created_at);
}

function getDisplayDateString(item) {
  return item.updated_at && item.updated_at !== item.created_at
    ? formatDateTime(item.updated_at)
    : item.created_at
    ? formatDateTime(item.created_at)
    : "-";
}

export default function TeacherItemBankComponent() {
  // -------------------- State: Items & Item Types --------------------
  const [items, setItems] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [selectedItemType, setSelectedItemType] = useState(null);
  const [allProgLanguages, setAllProgLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemScope, setItemScope] = useState("personal");

  // -------------------- Modals --------------------
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // -------------------- Item Data (for create/edit) --------------------
  const [itemData, setItemData] = useState({
    itemID: null,
    itemName: "",
    itemDesc: "",
    itemDifficulty: "Beginner",
    progLangIDs: [],
    testCases: [],
    itemPoints: 0
  });

  // -------------------- New State for Password Verification --------------------
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // -------------------- Code Testing / Terminal State --------------------
  const [code, setCode] = useState("");
  const [testLangID, setTestLangID] = useState(null);
  const [compiling, setCompiling] = useState(false);
  const [terminalLines, setTerminalLines] = useState([]);
  const [terminalPartialLine, setTerminalPartialLine] = useState("");
  const [terminalUserInput, setTerminalUserInput] = useState("");
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [testCaseAdded, setTestCaseAdded] = useState(false);
  const [errorOutput, setErrorOutput] = useState("");

  // -------------------- New State for Date Sorting --------------------
  const [dateSortOrder, setDateSortOrder] = useState("desc");

  // WebSocket references for terminal
  const wsRef = useRef(null);
  const inputRef = useRef(null);
  
  // Ref to track if any error occurred
  const errorRef = useRef(false);

  // Ref to accumulate output lines
  const outputRef = useRef("");

  // Helper: place caret at end of contentEditable element
  function placeCaretAtEnd(el) {
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // -------------------- Polling: Fetch Items --------------------
  useEffect(() => {
    if (selectedItemType !== null) {
      fetchItems(selectedItemType);
    }
    const interval = setInterval(() => {
      if (selectedItemType !== null) {
        fetchItems(selectedItemType);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedItemType, itemScope]);

  // -------------------- Lifecycle: Fetch Initial Data --------------------
  useEffect(() => {
    fetchItemTypes();
    fetchProgLanguages();
  }, []);

  useEffect(() => {
    if (showCreateModal || showEditModal) {
      if (itemData.progLangIDs.length > 0) {
        setTestLangID(itemData.progLangIDs[0]);
      } else {
        setTestLangID(null);
      }
      // Reset terminal-related state for each new run
      setTerminalLines([]);
      setTerminalPartialLine("");
      setTerminalUserInput("");
      setTestCaseAdded(false);
    }
  }, [showCreateModal, showEditModal, itemData.progLangIDs]);

  // -------------------- Derived: Check if selected item type is Console App --------------------
  const isConsoleApp = itemTypes.find(
    (type) => type.itemTypeID === selectedItemType
  )?.itemTypeName === "Console App";

  // -------------------- API Calls --------------------
  async function fetchItemTypes() {
    try {
      const response = await getItemTypes();
      if (!response.error && Array.isArray(response) && response.length > 0) {
        setItemTypes(response);
        setSelectedItemType(response[0].itemTypeID);
      } else {
        setItemTypes([]);
      }
    } catch (error) {
      console.error("Error fetching item types:", error);
    }
  }

  async function fetchProgLanguages() {
    try {
      const response = await getProgrammingLanguages();
      if (!response.error && Array.isArray(response)) {
        setAllProgLanguages(response);
      } else {
        console.error("Error fetching programming languages:", response.error);
      }
    } catch (error) {
      console.error("Error fetching programming languages:", error);
    }
  }

  // Note: We now use getItems() which accepts query parameters.
  async function fetchItems(itemTypeID) {
    setLoading(true);
    try {
      const teacherID = sessionStorage.getItem("userID");
      // Passing both scope and teacherID in the query object
      const response = await getItems(itemTypeID, { scope: itemScope, teacherID });
      if (!response || response.error || !Array.isArray(response)) {
        console.error("Error fetching items:", response?.error);
      } else {
        setItems(response);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!itemData.itemID) return;
    const teacherEmail = sessionStorage.getItem("user_email");
    if (!teacherEmail) {
      alert("Teacher email not found. Please log in again.");
      return;
    }
    const verification = await verifyPassword(teacherEmail, deletePassword);
    if (verification.error) {
      alert(verification.error);
      return;
    }
    const resp = await deleteItem(itemData.itemID);
    if (!resp.error) {
      alert("Item deleted successfully.");
      setItems(prev => (prev || []).filter(i => i.itemID !== itemData.itemID));
      fetchItems(selectedItemType);
      setShowDeleteModal(false);
      setDeletePassword("");
    } else {
      alert(resp.error);
    }
  }

  async function handleCreateOrUpdate() {
    if (
      !itemData.itemName.trim() ||
      !itemData.itemDesc.trim() ||
      itemData.progLangIDs.length === 0
    ) {
      alert("Please fill in all required fields (name, description, at least one language).");
      return;
    }
    if (isConsoleApp && (itemData.testCases || []).length === 0) {
      alert("Please add at least one test case for this item.");
      return;
    }
    if (isConsoleApp) {
      for (let i = 0; i < itemData.testCases.length; i++) {
        const tc = itemData.testCases[i];
        if (tc.testCasePoints === "" || isNaN(Number(tc.testCasePoints)) || Number(tc.testCasePoints) < 0) {
          alert(`Please enter a valid points value for test case ${i + 1}.`);
          return;
        }
      }
    }
    const computedItemPoints = isConsoleApp
      ? itemData.testCases.reduce(
          (sum, tc) => sum + Number(tc.testCasePoints || 0),
          0
        )
      : Number(itemData.itemPoints);
    const payload = {
      itemTypeID: selectedItemType,
      progLangIDs: itemData.progLangIDs,
      itemName: itemData.itemName.trim(),
      itemDesc: itemData.itemDesc.trim(),
      itemDifficulty: itemData.itemDifficulty,
      itemPoints: computedItemPoints,
      testCases: isConsoleApp
        ? itemData.testCases.filter(tc =>
            tc.expectedOutput.trim() !== ""
          )
        : []
    };
    if (showCreateModal && itemScope === "personal") {
      payload.teacherID = sessionStorage.getItem("userID");
    }
    let resp;
    if (showCreateModal) {
      resp = await createItem(payload);
    } else if (showEditModal) {
      if (!itemData.itemID) {
        alert("No item selected to update.");
        return;
      }
      resp = await updateItem(itemData.itemID, payload);
    }
    if (!resp.error) {
      fetchItems(selectedItemType);
      setShowCreateModal(false);
      setShowEditModal(false);
    } else {
      alert(resp.error);
    }
  }

  function handleRemoveTestCase(index) {
    const updated = itemData.testCases.filter((_, i) => i !== index);
    setItemData({ ...itemData, testCases: updated });
  }

  // -------------------- WebSocket Setup for NEUDev Terminal --------------------
  useEffect(() => {
    const ws = new WebSocket("https://neudevcompiler-production.up.railway.app");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "stdout") {
        if ((data.data ?? "").includes("Traceback")) {
          errorRef.current = true;
        }
        handleStdout(data.data ?? "");
      } 
      else if (data.type === "stderr") {
        errorRef.current = true;
        finalizeLine(`Error: ${data.data ?? ""}`, false); 
      } 
      else if (data.type === "exit") {
        if (terminalPartialLine || terminalUserInput) {
          finalizeLine(terminalPartialLine + terminalUserInput, false);
          setTerminalPartialLine("");
          setTerminalUserInput("");
        }
        finalizeLine("\n\n>>> Program Terminated", true);
        setCompiling(false);
        const finalOutput = outputRef.current.trim();
        if (errorRef.current || finalOutput.includes("Error:") || finalOutput.includes("Traceback")) {
          setErrorOutput(finalOutput);
          setShowErrorModal(true);
        } else {
          if (finalOutput) {
            const newTC = {
              expectedOutput: finalOutput,
              testCasePoints: "",
              isHidden: false
            };
            setItemData(prev => ({
              ...prev,
              testCases: [...prev.testCases, newTC]
            }));
            setTestCaseAdded(true);
          }
        }
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      ws.close();
    };
  }, []);

  // Handler for stdout from WebSocket
  function handleStdout(newData) {
    let buffer = terminalPartialLine + newData;
    const splitLines = buffer.split("\n");
    for (let i = 0; i < splitLines.length - 1; i++) {
      finalizeLine(splitLines[i]);
    }
    const lastPiece = splitLines[splitLines.length - 1];
    if (newData.endsWith("\n")) {
      if (lastPiece.trim() !== "") {
        finalizeLine(lastPiece);
      }
      setTerminalPartialLine("");
    } else {
      setTerminalPartialLine(lastPiece);
    }
  }
  
  // --------------------
  // finalizeLine
  // --------------------
  function finalizeLine(text, skipOutput = false) {
    setTerminalLines(prev => [...prev, text]);
    if (!skipOutput) {
      outputRef.current += text + "\n";
    }
  }

  const handleTerminalClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      placeCaretAtEnd(inputRef.current);
    }
  };

  const handleInputChange = (e) => {
    setTerminalUserInput(e.currentTarget.textContent);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data: terminalUserInput }));
      }
      setTerminalPartialLine("");
      setTerminalUserInput("");
      if (inputRef.current) {
        inputRef.current.textContent = "";
      }
    }
  };

  const handleCloseTerminal = () => {
    if (compiling && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "kill" }));
    }
    setCompiling(false);
    setShowTerminalModal(false);
    setTerminalLines([]);
    setTerminalPartialLine("");
    setTerminalUserInput("");
  };

  const handleRunCode = async () => {
    if (!isConsoleApp) return;
    if (!testLangID) {
      alert("Please select which language to test with.");
      return;
    }
    const foundLang = allProgLanguages.find(l => l.progLangID === testLangID);
    if (!foundLang) {
      alert("Selected language is not recognized.");
      return;
    }
    if (!isValidCodeForLanguage(code, foundLang.progLangName)) {
      alert(`Your code does not look like valid ${foundLang.progLangName} code.`);
      return;
    }
    const shortCode = compilerCodeMap[testLangID];
    if (!shortCode) {
      alert(`The compiler does not support ${foundLang.progLangName} yet.`);
      return;
    }
    if (!code.trim()) {
      alert("Please enter some code before running.");
      return;
    }

    setTerminalLines([]);
    setTerminalPartialLine("");
    setTerminalUserInput("");
    setTestCaseAdded(false);
    errorRef.current = false;
    outputRef.current = "";

    setShowTerminalModal(true);
    setCompiling(true);

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "init",
          language: shortCode,
          code: code,
          input: ""
        })
      );
    } else {
      finalizeLine("Error: WebSocket not connected.", false);
      errorRef.current = true;
      setCompiling(false);
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    const dateA = getDisplayTimestamp(a);
    const dateB = getDisplayTimestamp(b);
    return dateSortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  function AutoResizeTextarea({ value, ...props }) {
    const textareaRef = useRef(null);
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      }
    }, [value]);
    return (
      <Form.Control
        as="textarea"
        ref={textareaRef}
        value={value}
        rows={1}
        style={{
          whiteSpace: "pre-wrap",
          overflow: "hidden",
          resize: "none"
        }}
        {...props}
      />
    );
  }

  // -------------------- Render --------------------
  return (
    <div className="activity-items">
      <ProfilePlaygroundNavbarComponent />

      {/* Header */}
      <header className="activity-header">
        <div className="header-content">
          <div className="left-indicator"></div>
          <h2 className="activity-title">Item Bank</h2>
          <button
            className="create-btn"
            onClick={() => {
              setItemData({
                itemID: null,
                itemName: "",
                itemDesc: "",
                itemDifficulty: "Beginner",
                progLangIDs: [],
                testCases: [],
                itemPoints: 0
              });
              setTerminalLines([]);
              setTerminalPartialLine("");
              setTerminalUserInput("");
              setTestLangID(null);
              setShowCreateModal(true);
            }}
          >
            + Add Item
          </button>
        </div>
      </header>

      {/* Item Type Selector */}
      <div className="filter-section">
        <label>Item Type:</label>
        <select
          onChange={(e) => setSelectedItemType(parseInt(e.target.value))}
          value={selectedItemType ?? ""}
        >
          {itemTypes.length > 0 ? (
            itemTypes.map((type) => (
              <option key={type.itemTypeID} value={type.itemTypeID}>
                {type.itemTypeName}
              </option>
            ))
          ) : (
            <option value="">No Item Types Available</option>
          )}
        </select>
      </div>

      {/* Item Creator Selector */}
      <div className="filter-section">
        <label>Item Creator:</label>
        <select
          value={itemScope}
          onChange={(e) => setItemScope(e.target.value)}
        >
          <option value="personal">Created by Me</option>
          <option value="global">NEUDev</option>
        </select>
      </div>

      {/* Table of Items */}
      <div className="table-wrapper">
        <table className="item-table">
          <thead>
            <tr>
              <th>ITEM NAME</th>
              <th>DIFFICULTY</th>
              <th>POINTS</th>
              <th>LANGUAGES</th>
              {isConsoleApp && <th>TEST CASES</th>}
              <th onClick={() => setDateSortOrder(prev => (prev === "desc" ? "asc" : "desc"))} style={{ cursor: "pointer" }}>
                DATE &amp; TIME CREATED/UPDATED{" "}
                <FontAwesomeIcon
                  icon={dateSortOrder === "asc" ? faCaretUp : faCaretDown}
                  style={{ marginLeft: "5px" }}
                />
              </th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center" }}>
                  Loading...
                </td>
              </tr>
            ) : !loading && sortedItems.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center" }}>
                  No items found.
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const progLangArray = item.programming_languages || [];
                return (
                  <tr key={item.itemID}>
                    <td>{item.itemName}</td>
                    <td>{item.itemDifficulty}</td>
                    <td>{item.itemPoints || "-"}</td>
                    <td>
                      {progLangArray.length > 0
                        ? progLangArray.map((langObj, idx) => {
                            const langName = langObj.progLangName;
                            const known = programmingLanguageMap[langName] || { name: langName, image: null };
                            return (
                              <span key={idx} style={{ marginRight: "8px" }}>
                                {known.image ? (
                                  <>
                                    <img 
                                      src={known.image}
                                      alt={`${known.name} icon`}
                                      style={{ width: "20px", marginRight: "4px" }}
                                    />
                                    {known.name}
                                  </>
                                ) : (
                                  known.name
                                )}
                                {idx < progLangArray.length - 1 ? "," : ""}
                              </span>
                            );
                          })
                        : "-"}
                    </td>
                    {isConsoleApp && (
                      <td>
                        {item.test_cases && item.test_cases.length > 0
                          ? `${item.test_cases.length} test case(s)`
                          : "No test cases"}
                      </td>
                    )}
                    <td>{getDisplayDateString(item)}</td>
                    <td>
                      <button
                        className="edit-btn"
                        onClick={() => {
                          const plIDs = (item.programming_languages || []).map(l => l.progLangID);
                          setItemData({
                            itemID: item.itemID,
                            itemName: item.itemName,
                            itemDesc: item.itemDesc,
                            itemDifficulty: item.itemDifficulty,
                            progLangIDs: plIDs,
                            testCases: (item.test_cases || []).map(tc => ({
                              expectedOutput: tc.expectedOutput,
                              testCasePoints: tc.testCasePoints ?? "",
                              isHidden: tc.isHidden ?? false
                            })),
                            itemPoints: item.itemPoints || 0
                          });
                          setTerminalLines([]);
                          setTerminalPartialLine("");
                          setTerminalUserInput("");
                          setTestLangID(plIDs.length > 0 ? plIDs[0] : null);
                          setShowEditModal(true);
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => {
                          const plIDs = (item.programming_languages || []).map(l => l.progLangID);
                          setItemData({
                            itemID: item.itemID,
                            itemName: item.itemName,
                            itemDesc: item.itemDesc,
                            itemDifficulty: item.itemDifficulty,
                            progLangIDs: plIDs,
                            testCases: (item.test_cases || []).map(tc => ({
                              expectedOutput: tc.expectedOutput,
                              testCasePoints: tc.testCasePoints ?? "",
                              isHidden: tc.isHidden ?? false
                            })),
                            itemPoints: item.itemPoints || 0
                          });
                          setDeletePassword("");
                          setShowDeleteModal(true);
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* -------------------- Create/Edit Modal -------------------- */}
      <Modal
        show={showCreateModal || showEditModal}
        onHide={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
        }}
        backdrop="static" 
        keyboard={false}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {showCreateModal ? "Add Item" : "Edit Item"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Item Name */}
            <Form.Group className="mb-3">
              <Form.Label>Item Name</Form.Label>
              <Form.Control
                type="text"
                value={itemData.itemName}
                onChange={(e) =>
                  setItemData({ ...itemData, itemName: e.target.value })
                }
              />
            </Form.Group>

            {/* Item Description */}
            <Form.Group className="mb-3">
              <Form.Label>Item Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={itemData.itemDesc}
                onChange={(e) =>
                  setItemData({ ...itemData, itemDesc: e.target.value })
                }
              />
            </Form.Group>

            {/* Difficulty */}
            <Form.Group className="mb-3">
              <Form.Label>Difficulty</Form.Label>
              <Form.Select
                value={itemData.itemDifficulty}
                onChange={(e) =>
                  setItemData({ ...itemData, itemDifficulty: e.target.value })
                }
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </Form.Select>
            </Form.Group>

            {/* Conditional Item Points */}
            {isConsoleApp ? (
              <Form.Group className="mb-3">
                <Form.Label>Total Item Points (auto-calculated from test cases)</Form.Label>
                <Form.Control
                  type="number"
                  value={
                    itemData.testCases.reduce(
                      (sum, tc) => sum + Number(tc.testCasePoints || 0),
                      0
                    )
                  }
                  readOnly
                />
              </Form.Group>
            ) : (
              <Form.Group className="mb-3">
                <Form.Label>Item Points</Form.Label>
                <Form.Control
                  type="number"
                  value={itemData.itemPoints}
                  onChange={(e) =>
                    setItemData({ ...itemData, itemPoints: e.target.value })
                  }
                />
              </Form.Group>
            )}

            {/* Programming Languages */}
            <Form.Group className="mb-3">
              <Form.Label>Programming Languages</Form.Label>
              <div style={{ marginBottom: "0.5rem" }}>
                <Form.Check
                  type="checkbox"
                  label="Applicable to all"
                  checked={
                    itemData.progLangIDs.length > 0 &&
                    itemData.progLangIDs.length === allProgLanguages.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      const allIDs = allProgLanguages.map(lang => lang.progLangID);
                      setItemData({ ...itemData, progLangIDs: allIDs });
                      if (allIDs.length > 0) setTestLangID(allIDs[0]);
                    } else {
                      setItemData({ ...itemData, progLangIDs: [] });
                      setTestLangID(null);
                    }
                  }}
                />
              </div>
              {allProgLanguages.map((lang) => (
                <Form.Check
                  key={lang.progLangID}
                  type="checkbox"
                  label={lang.progLangName}
                  checked={itemData.progLangIDs.includes(lang.progLangID)}
                  onChange={() => {
                    const current = itemData.progLangIDs || [];
                    let updated;
                    if (current.includes(lang.progLangID)) {
                      updated = current.filter(id => id !== lang.progLangID);
                    } else {
                      updated = [...current, lang.progLangID];
                    }
                    setItemData({ ...itemData, progLangIDs: updated });
                    if (testLangID === lang.progLangID) setTestLangID(null);
                  }}
                />
              ))}
            </Form.Group>

            {/* Conditional rendering for Console App only */}
            {isConsoleApp && (
              <>
                {itemData.progLangIDs.length > 1 && (
                  <Form.Group className="mb-3">
                    <Form.Label>Select Language to Test This Code</Form.Label>
                    <Form.Select
                      value={testLangID || ""}
                      onChange={(e) => setTestLangID(parseInt(e.target.value, 10))}
                    >
                      <option value="">-- Pick a language --</option>
                      {itemData.progLangIDs.map((langID) => {
                        const found = allProgLanguages.find(l => l.progLangID === langID);
                        return (
                          <option key={langID} value={langID}>
                            {found ? found.progLangName : `LanguageID ${langID}`}
                          </option>
                        );
                      })}
                    </Form.Select>
                  </Form.Group>
                )}

                <Form.Group className="mb-3">
                  <Form.Label>Test Cases (added after each successful run)</Form.Label>
                  {(itemData.testCases || []).map((tc, index) => (
                    <div
                      key={index}
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        marginBottom: "10px"
                      }}
                    >
                      <AutoResizeTextarea
                        readOnly
                        value={tc.expectedOutput}
                        style={{ marginBottom: "5px" }}
                      />
                      <Form.Control
                        type="number"
                        placeholder="Enter points for this test case"
                        value={tc.testCasePoints ?? ""}
                        onChange={(e) => {
                          const updatedTestCases = [...itemData.testCases];
                          updatedTestCases[index].testCasePoints = e.target.value;
                          setItemData({ ...itemData, testCases: updatedTestCases });
                        }}
                      />
                      <Form.Check
                        type="checkbox"
                        label="Hidden"
                        checked={tc.isHidden || false}
                        onChange={(e) => {
                          const updatedTestCases = [...itemData.testCases];
                          updatedTestCases[index].isHidden = e.target.checked;
                          setItemData({ ...itemData, testCases: updatedTestCases });
                        }}
                        style={{ marginTop: "5px" }}
                      />
                      <Button
                        variant="outline-danger"
                        size="sm"
                        style={{ marginTop: "5px" }}
                        onClick={() => handleRemoveTestCase(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Code solution: </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={15}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Write your code solution here"
                  />
                </Form.Group>

                <div style={{ marginBottom: "1rem" }}>
                  <Button variant="info" onClick={handleRunCode} disabled={compiling}>
                    {compiling ? <Spinner animation="border" size="sm" /> : "Run Code"}
                  </Button>
                </div>
              </>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
            }}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateOrUpdate}>
            {showCreateModal ? "Add" : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* -------------------- Delete Confirmation Modal with Password -------------------- */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete the item “{itemData.itemName}”?</p>
          <Form.Group controlId="deletePassword">
            <Form.Label>Enter your password</Form.Label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Form.Control
                type={showDeletePassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowDeletePassword(!showDeletePassword)}
                style={{ marginLeft: "5px" }}
              >
                <FontAwesomeIcon icon={showDeletePassword ? faEyeSlash : faEye} />
              </Button>
            </div>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* -------------------- Terminal Modal for NEUDev -------------------- */}
      <Modal
        show={showTerminalModal}
        onHide={handleCloseTerminal}
        size="lg"
        backdrop="static"
        keyboard={false}
        centered
        className="dark-terminal-modal"
      >
        <Modal.Header closeButton className="dark-terminal-modal-header">
          <Modal.Title>NEUDev Terminal</Modal.Title>
        </Modal.Header>
        <Modal.Body className="dark-terminal-modal-body">
          <div
            className="terminal"
            style={{
              backgroundColor: "#1e1e1e",
              color: "#fff",
              padding: "10px",
              fontFamily: "monospace",
              minHeight: "250px",
              overflowY: "auto"
            }}
            onClick={handleTerminalClick}
          >
            {terminalLines.map((line, idx) => (
              <div key={idx} style={{ whiteSpace: "pre-wrap" }}>
                {line}
              </div>
            ))}
            <div style={{ whiteSpace: "pre-wrap" }}>
              <span>{terminalPartialLine}</span>
              <span
                ref={inputRef}
                contentEditable
                suppressContentEditableWarning
                style={{ outline: "none" }}
                onInput={handleInputChange}
                onKeyDown={handleInputKeyDown}
              />
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* -------------------- Error Modal: Prompt to Add Error as Test Case -------------------- */}
      <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Compilation Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>The code encountered an error during execution:</p>
          <pre style={{
            backgroundColor: '#f8d7da',
            padding: '10px',
            borderRadius: '5px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {errorOutput}
          </pre>
          <p>Do you want to add this error output as a test case?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowErrorModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => {
            const newTC = {
              expectedOutput: errorOutput,
              testCasePoints: "",
              isHidden: false
            };
            setItemData(prev => ({
              ...prev,
              testCases: [...prev.testCases, newTC]
            }));
            setTestCaseAdded(true);
            setShowErrorModal(false);
          }}>
            Add as Test Case
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}