import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBold, faItalic, faUnderline, faSuperscript, 
  faAlignLeft, faAlignCenter, faAlignRight, faCaretDown 
} from '@fortawesome/free-solid-svg-icons';
import '/src/style/teacher/amCreateNewActivity.css';
import TeacherCMNavigationBarComponent from './TeacherCMNavigationBarComponent';

// --- Updated: using getItems instead of getItemsByItemType
import { 
  getItems,
  createActivity, 
  getItemTypes, 
  getProgrammingLanguages 
} from '../api/API';

// 1) Use the **name** returned by your backend as keys.
//    If your backend returns "C#", "Java", and "Python",
//    your map should be exactly like this:
const programmingLanguageMap = {
  "C#":     { name: "C#",     image: "/src/assets/c.png" },
  "Java":   { name: "Java",   image: "/src/assets/java2.png" },
  "Python": { name: "Python", image: "/src/assets/py.png" }
};

export const TeacherCreateActivityComponent = () => {
  const navigate = useNavigate();

  // -------------------- Activity Form State --------------------
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [actDifficulty, setDifficulty] = useState('');

  // Store duration as "HH:MM:SS" (input as minutes)
  const [activityDuration, setActivityDuration] = useState('');
  
  // -------------------- Item Bank State --------------------
  const [selectedItems, setSelectedItems] = useState([null, null, null]);
  const [presetItems, setPresetItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  // New state for item bank scope (personal vs. global)
  const [itemBankScope, setItemBankScope] = useState("personal");

  // -------------------- Item Types & Programming Languages --------------------
  const [selectedProgLangs, setSelectedProgLangs] = useState([]);
  const [selectedItemType, setSelectedItemType] = useState(null);
  const [itemTypeName, setItemTypeName] = useState('');
  const [itemTypes, setItemTypes] = useState([]);

  // -------------------- Dates --------------------
  const [dateOpened, setDateOpened] = useState('');
  const [dateClosed, setDateClosed] = useState('');

  // -------------------- Modal State --------------------
  const [showModal, setShowModal] = useState(false);
  const [showItemTypeDropdown, setShowItemTypeDropdown] = useState(false);

  // -------------------- Programming Languages from Server --------------------
  const [programmingLanguages, setProgrammingLanguages] = useState([]);

  // For actDuration input in minutes
  const [durationInMinutes, setDurationInMinutes] = useState("0");

  // -------------------- Sorting Preset Items --------------------
  const [itemSortField, setItemSortField] = useState("itemName");
  const [itemSortOrder, setItemSortOrder] = useState("asc");

  const toggleItemSortOrder = (field) => {
    if (itemSortField === field) {
      setItemSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setItemSortField(field);
      setItemSortOrder("asc");
    }
  };

  const difficultyOrder = {
    "Beginner": 1,
    "Intermediate": 2,
    "Advanced": 3
  };

  const sortedPresetItems = [...presetItems].sort((a, b) => {
    let fieldA, fieldB;
    switch (itemSortField) {
      case "itemName":
        fieldA = (a.itemName || "").toLowerCase();
        fieldB = (b.itemName || "").toLowerCase();
        break;
      case "itemDifficulty":
        fieldA = difficultyOrder[a.itemDifficulty] || 0;
        fieldB = difficultyOrder[b.itemDifficulty] || 0;
        break;
      case "itemPoints":
        fieldA = a.itemPoints || 0;
        fieldB = b.itemPoints || 0;
        break;
      default:
        fieldA = (a.itemName || "").toLowerCase();
        fieldB = (b.itemName || "").toLowerCase();
    }
    if (fieldA < fieldB) return itemSortOrder === "asc" ? -1 : 1;
    if (fieldA > fieldB) return itemSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // -------------------- Lifecycle --------------------
  useEffect(() => {
    fetchItemTypes();
    fetchProgrammingLanguages();
  }, []);

  useEffect(() => {
    if (selectedItemType) {
      fetchPresetItems();
    }
  }, [selectedItemType, itemBankScope]);

  // -------------------- API Calls --------------------
  const fetchItemTypes = async () => {
    const response = await getItemTypes();
    if (!response.error && response.length > 0) {
      setItemTypes(response);
      setSelectedItemType(response[0].itemTypeID);
      setItemTypeName(response[0].itemTypeName);
    } else {
      console.error("❌ Failed to fetch item types:", response.error);
    }
  };

  const fetchProgrammingLanguages = async () => {
    const response = await getProgrammingLanguages();
    if (!response.error && Array.isArray(response)) {
      setProgrammingLanguages(response);
    } else {
      console.error("❌ Failed to fetch programming languages:", response.error);
    }
  };

  const fetchPresetItems = async () => {
    const teacherID = sessionStorage.getItem("userID");
    // Use getItems with query params
    const response = await getItems(selectedItemType, { scope: itemBankScope, teacherID });
    if (!response.error) {
      setPresetItems(response);
    } else {
      console.error("❌ Failed to fetch preset items:", response.error);
    }
  };

  // -------------------- Modal Handlers --------------------
  const handleItemClick = (index) => {
    setSelectedItemIndex(index);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
  };

  const handleSaveItem = () => {
    if (!selectedItem || selectedItemIndex === null) return;

    // Check if the same item is already picked in another slot
    const alreadyExists = selectedItems.some(
      (it, i) => i !== selectedItemIndex && it && it.itemID === selectedItem.itemID
    );
    if (alreadyExists) {
      alert("❌ You already picked that item. Please choose a different one.");
      return;
    }

    const updated = [...selectedItems];
    updated[selectedItemIndex] = selectedItem;
    setSelectedItems(updated);
    setSelectedItem(null);
    setShowModal(false);
  };

  const handleItemTypeSelect = (type) => {
    setSelectedItemType(type.itemTypeID);
    setItemTypeName(type.itemTypeName);
    setShowItemTypeDropdown(false);
  };

  // -------------------- Programming Languages Checkboxes --------------------
  const handleProgLangToggle = (langID) => {
    if (selectedProgLangs.includes(langID)) {
      setSelectedProgLangs(selectedProgLangs.filter(id => id !== langID));
    } else {
      setSelectedProgLangs([...selectedProgLangs, langID]);
    }
  };

  const handleSelectAllLangs = (checked) => {
    if (checked) {
      const allIDs = programmingLanguages.map(lang => lang.progLangID);
      setSelectedProgLangs(allIDs);
    } else {
      setSelectedProgLangs([]);
    }
  };

  // -------------------- Create Activity Handler --------------------
  const handleCreateActivity = async (e) => {
    e.preventDefault();

    if (
      !activityTitle.trim() ||
      !activityDescription.trim() ||
      !actDifficulty ||
      !durationInMinutes ||
      selectedProgLangs.length === 0 ||
      !dateOpened ||
      !dateClosed ||
      selectedItems.every(item => item === null)
    ) {
      alert("⚠️ All fields are required, including at least one programming language, one item, and an activity duration.");
      return;
    }

    const classID = sessionStorage.getItem("selectedClassID");

    // Build final item objects
    const finalItems = selectedItems
      .filter(item => item !== null)
      .map(item => ({
        itemID: item.itemID,
        itemTypeID: selectedItemType,
        actItemPoints: item.itemPoints
      }));

    if (finalItems.length === 0) {
      alert("⚠️ Please select at least one valid item.");
      return;
    }

    // Compute total points from selected items
    const computedPoints = finalItems.reduce((sum, it) => sum + (it.actItemPoints || 0), 0);

    // Convert total minutes to HH:MM:SS
    const total = parseInt(durationInMinutes, 10);
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    const ss = "00"; // fixed
    const finalDuration = `${hh}:${mm}:${ss}`;

    const newActivity = {
      classID,
      actTitle: activityTitle,
      actDesc: activityDescription,
      actDifficulty,
      actDuration: finalDuration,
      openDate: dateOpened,
      closeDate: dateClosed,
      progLangIDs: selectedProgLangs,
      maxPoints: computedPoints,
      items: finalItems
    };

    console.log("📤 Sending Activity Data:", JSON.stringify(newActivity, null, 2));

    const response = await createActivity(newActivity);
    if (response.error) {
      alert(`❌ Failed to create activity: ${response.error}`);
    } else {
      alert("✅ Activity created successfully!");
      navigate(`/teacher/class/${classID}/activity`);
    }
  };

  return (
    <div className="whole-container">
      <TeacherCMNavigationBarComponent />
      <div className='create-activity-content'>
        <div className='create-activity-container'>
          <h2>Create an Activity</h2>
          <Form className='create-activity-form' onSubmit={handleCreateActivity}>
            {/* Activity Title */}
            <Form.Control 
              className='create-activity-title'
              type='text' 
              placeholder='Title...' 
              value={activityTitle} 
              onChange={(e) => setActivityTitle(e.target.value)} 
              required
            />

            {/* Description */}
            <div className='description-section'>
              <div className='description-toolbar'>
                <FontAwesomeIcon icon={faBold} />
                <FontAwesomeIcon icon={faItalic} />
                <FontAwesomeIcon icon={faUnderline} />
                <FontAwesomeIcon icon={faSuperscript} />
                <FontAwesomeIcon icon={faAlignLeft} />
                <FontAwesomeIcon icon={faAlignCenter} />
                <FontAwesomeIcon icon={faAlignRight} />
              </div>
              <Form.Control 
                as='textarea' 
                placeholder='Description...' 
                value={activityDescription} 
                onChange={(e) => setActivityDescription(e.target.value)} 
                required
              />
            </div>

            {/* 3 Item Slots */}
            <div className='question-section'>
              <h4>Set Items (Maximum of 3)</h4>
              {selectedItems.map((item, index) => (
                <div 
                  key={index} 
                  style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}
                  onClick={() => handleItemClick(index)}
                >
                  <Form.Control
                    type="text"
                    placeholder={`Item ${index + 1}`}
                    value={
                      item
                        ? `${item.itemName} | ${item.itemDifficulty || "-"} | ${item.itemPoints || 0} pts`
                        : ""
                    }
                    readOnly
                    required={index === 0}
                    style={{ flex: 1 }}
                  />
                  {/* Here we display each language's icon + name */}
                  {item && (item.programming_languages || item.programmingLanguages) && (
                    <div style={{ marginLeft: "8px" }}>
                      {(item.programming_languages || item.programmingLanguages || []).map((langObj, i) => {
                        const langName = langObj.progLangName;
                        // Use the map that matches exactly your backend's language names:
                        const known = programmingLanguageMap[langName] || { name: langName, image: null };
                        return (
                          <span key={i} style={{ marginRight: "5px", fontSize: "12px" }}>
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
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Difficulty + Date/Time */}
            <div className='difficulty-section'>
              <Form.Control 
                as='select' 
                value={actDifficulty} 
                onChange={(e) => setDifficulty(e.target.value)} 
                required
              >
                <option value=''>Select Difficulty</option>
                <option value='Beginner'>Beginner</option>
                <option value='Intermediate'>Intermediate</option>
                <option value='Advanced'>Advanced</option>
              </Form.Control>

              <DateTimeItem 
                icon="bi bi-calendar-check" 
                label="Open Date and Time" 
                date={dateOpened} 
                setDate={setDateOpened} 
                className="open-date" 
              />
              <DateTimeItem 
                icon="bi bi-calendar2-week" 
                label="Due Date and Time" 
                date={dateClosed} 
                setDate={setDateClosed} 
                className="due-date" 
              />
            </div>

            {/* Activity Duration Input (in minutes) */}
            <Form.Group className="mt-3">
              <Form.Label>Activity Duration (in minutes)</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={durationInMinutes}
                onChange={(e) => setDurationInMinutes(e.target.value)}
                placeholder="Enter total minutes"
                required
              />
              <Form.Text className="text-muted">
                e.g., 90 → 1 hour 30 minutes
              </Form.Text>
            </Form.Group>

            {/* Programming Languages (Checkboxes) */}
            <Form.Group className="mt-3">
              <Form.Label>Select all languages that can be used to solve this item.</Form.Label>
              <div style={{ marginBottom: "0.5rem" }}>
                <Form.Check 
                  type="checkbox"
                  label="Applicable to all"
                  checked={
                    selectedProgLangs.length > 0 &&
                    selectedProgLangs.length === programmingLanguages.length
                  }
                  onChange={(e) => handleSelectAllLangs(e.target.checked)}
                />
              </div>
              {programmingLanguages.map((lang) => (
                <Form.Check 
                  key={lang.progLangID}
                  type="checkbox"
                  label={lang.progLangName}
                  checked={selectedProgLangs.includes(lang.progLangID)}
                  onChange={() => handleProgLangToggle(lang.progLangID)}
                />
              ))}
            </Form.Group>

            {/* Display computed Total Points */}
            <Form.Group className="mt-3">
              <Form.Label>Total Points (automatically computed)</Form.Label>
              <Form.Control 
                type="number" 
                value={
                  selectedItems
                    .filter(item => item !== null)
                    .reduce((sum, item) => sum + (item.itemPoints || 0), 0)
                }
                readOnly
              />
            </Form.Group>

            <Button className='custom-create-class-btn mt-3' type="submit">
              <i className="bi bi-pencil-square"></i> Create Activity
            </Button>
          </Form>
        </div>

        {/* Modal for selecting an item */}
        <Modal
          show={showModal}
          onHide={() => setShowModal(false)}
          dialogClassName="custom-modal"
          backdropClassName="custom-modal-backdrop"
          centered={false}
        >
          <div className="custom-modal-content">
            <Modal.Header closeButton>
              <Modal.Title>Choose an Item</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <h5>Item Type:</h5>
              <Button variant="light" onClick={() => setShowItemTypeDropdown(!showItemTypeDropdown)}>
                {itemTypeName} <FontAwesomeIcon icon={faCaretDown} />
              </Button>
              {showItemTypeDropdown && (
                <div className="item-type-dropdown">
                  {itemTypes.map(type => (
                    <Button
                      key={type.itemTypeID}
                      className="dropdown-item"
                      onClick={() => handleItemTypeSelect(type)}
                    >
                      {type.itemTypeName}
                    </Button>
                  ))}
                </div>
              )}
              {/* NEW: Item Creator Selector */}
              <div className="filter-section" style={{ marginBottom: "10px" }}>
                <label>Item Creator:</label>
                <select
                  value={itemBankScope}
                  onChange={(e) => {
                    setItemBankScope(e.target.value);
                    fetchPresetItems();
                  }}
                >
                  <option value="personal">Created by Me</option>
                  <option value="global">NEUDev</option>
                </select>
              </div>

              {/* Sorting Controls for preset items */}
              <div
                style={{
                  margin: "10px 0",
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid red",
                  padding: "5px",
                  borderRadius: "4px",
                  backgroundColor: "#f8f9fa"
                }}
              >
                <span style={{ marginRight: "8px" }}>Sort by:</span>
                <Button variant="link" onClick={() => toggleItemSortOrder("itemName")}>
                  Name {itemSortField === "itemName" && (itemSortOrder === "asc" ? "↑" : "↓")}
                </Button>
                <Button variant="link" onClick={() => toggleItemSortOrder("itemDifficulty")}>
                  Difficulty {itemSortField === "itemDifficulty" && (itemSortOrder === "asc" ? "↑" : "↓")}
                </Button>
                <Button variant="link" onClick={() => toggleItemSortOrder("itemPoints")}>
                  Points {itemSortField === "itemPoints" && (itemSortOrder === "asc" ? "↑" : "↓")}
                </Button>
              </div>

              {sortedPresetItems.length === 0 ? (
                <p>
                  There are no items yet. Please go to the{' '}
                  <a href="/teacher/item">Item Bank</a> to create items.
                </p>
              ) : (
                sortedPresetItems.map((item, idx) => (
                  <Button
                    key={idx}
                    className={`question-item d-block ${selectedItem === item ? 'highlighted' : ''}`}
                    onClick={() => handleSelectItem(item)}
                    style={{ textAlign: "left", marginBottom: "8px" }}
                  >
                    <div>
                      <strong>{item.itemName}</strong> | {item.itemDifficulty} | {item.itemPoints} pts
                    </div>
                    <div style={{ marginTop: "5px" }}>
                      {(item.programming_languages || item.programmingLanguages || []).map((langObj, i) => {
                        const plName = langObj.progLangName;
                        const mapping = programmingLanguageMap[plName] || { name: plName, image: null };
                        return mapping.image ? (
                          <img
                            key={i}
                            src={mapping.image}
                            alt={mapping.name}
                            style={{ width: "20px", marginRight: "5px" }}
                          />
                        ) : (
                          <span key={i} style={{ marginRight: "5px", fontSize: "12px" }}>
                            {mapping.name}
                          </span>
                        );
                      })}
                    </div>
                  </Button>
                ))
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveItem}>Save Item</Button>
            </Modal.Footer>
          </div>
        </Modal>
      </div>
    </div>
  );
};

// A small helper component for date/time inputs
const DateTimeItem = ({ icon, label, date, setDate, className }) => (
  <div className={`date-time-item ${className}`}>
    <div className="label-with-icon">
      <i className={icon}></i>
      <label>{label}</label>
    </div>
    <input
      type="datetime-local"
      value={date}
      onChange={(e) => setDate(e.target.value)}
      required
    />
  </div>
);

export default TeacherCreateActivityComponent;