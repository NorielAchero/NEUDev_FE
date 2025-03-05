import { faBars, faDesktop, faLaptopCode, faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState, useEffect } from 'react';
import { Button, Card, Dropdown, Form, Modal, Nav, Navbar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '/src/style/teacher/dashboard.css';

import { logout, getProfile, createClass, getClasses, updateClass, deleteClass, verifyPassword } from '../api/API.js';

export const TeacherDashboardComponent = () => {
    const defaultProfileImage = '/src/assets/noy.png';
    const [profileImage, setProfileImage] = useState(defaultProfileImage);
    const [className, setClassName] = useState("");
    const [classSection, setClassSection] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateClass, setShowCreateClass] = useState(false);
    const [classes, setClasses] = useState([]); 
    const [instructorName, setInstructorName] = useState("");

    // State for editing a class
    const [showEditModal, setShowEditModal] = useState(false);
    const [editClassData, setEditClassData] = useState({ id: null, className: "", classSection: "" });
    const [isEditing, setIsEditing] = useState(false);

    // State for deleting a class
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteClassData, setDeleteClassData] = useState(null);
    const [deletePassword, setDeletePassword] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await getProfile();
                console.log("🔍 API Response (Profile):", response);
                if (response) {
                    setProfileImage(response.profileImage || defaultProfileImage);
                    setInstructorName(`${response.firstname} ${response.lastname}`);
                }
            } catch (error) {
                console.error("❌ Error fetching profile:", error);
            }
        };

        const fetchClasses = async () => {
            const response = await getClasses();
            console.log("📥 Fetched Classes (Filtered for Teacher):", response);
            if (!response.error) {
                // Update each class with the instructor name
                const updatedClasses = response.map(cls => ({
                    ...cls,
                    instructorName: instructorName
                }));
                setClasses(updatedClasses);
            } else {
                console.error("❌ Failed to fetch classes:", response.error);
            }
        };

        fetchProfile();
        fetchClasses();
    }, [instructorName]);

    const handleLogout = async () => {
        const result = await logout();
        if (!result.error) {
            alert("✅ Logout successful");
            window.location.href = "/home";
        } else {
            alert("❌ Logout failed. Try again.");
        }
    };

    const handleClassCreate = async (e) => {
        e.preventDefault();
        if (!className.trim() || !classSection.trim()) {
            alert("⚠️ Please enter both class name and section.");
            return;
        }
        setIsCreating(true);
        const classData = {
            className: className,
            classSection: classSection
        };
        console.log("📤 Sending Class Data:", classData);
        const response = await createClass(classData);
        if (response.error) {
            alert(`❌ Class creation failed: ${response.error}`);
        } else {
            alert("✅ Class created successfully!");
            setShowCreateClass(false);
            setClassName("");
            setClassSection("");
            setClasses([...classes, { ...response, instructorName }]);
        }
        setIsCreating(false);
    };

    // Open the edit modal with the class data
    const handleEditClass = (classItem, event) => {
        event.stopPropagation();
        setEditClassData({
            id: classItem.id || classItem.classID,
            className: classItem.className,
            classSection: classItem.classSection
        });
        setShowEditModal(true);
    };

    // Save the changes to the server and update local state
    const handleEditClassSave = async (e) => {
        e.preventDefault();
        if (!editClassData.className.trim() || !editClassData.classSection.trim()) {
            alert("⚠️ Please enter both class name and section.");
            return;
        }
        setIsEditing(true);
        
        // Call the updateClass API function
        const response = await updateClass(editClassData.id, editClassData);
        
        if (response.error) {
            alert(`❌ Failed to update class: ${response.error}`);
            setIsEditing(false);
            return;
        }
        
        // Update local state with new values
        const updatedClasses = classes.map(cls => {
            if ((cls.id || cls.classID) === editClassData.id) {
                return { ...cls, ...editClassData, instructorName };
            }
            return cls;
        });
        setClasses(updatedClasses);
        alert("✅ Class updated successfully!");
        setShowEditModal(false);
        setIsEditing(false);
    };

    // Open the delete modal and set the class to delete
    const handleDeleteClass = (classItem, event) => {
        event.stopPropagation();
        setDeleteClassData(classItem);
        setShowDeleteModal(true);
    };

    // Delete the class after verifying the teacher's password
    const handleDeleteClassConfirm = async (e) => {
        e.preventDefault();
        if (!deletePassword.trim()) {
            alert("⚠️ Please enter your password to confirm deletion.");
            return;
        }
        // Get the teacher's email from session storage
        const teacherEmail = sessionStorage.getItem("user_email");
        // Verify password using the API
        const verifyResponse = await verifyPassword(teacherEmail, deletePassword);
        if (verifyResponse.error) {
            alert(`❌ Password verification failed: ${verifyResponse.error}`);
            return;
        }
        // Password verified, call the deleteClass API function
        const classID = deleteClassData.id || deleteClassData.classID;
        const deleteResponse = await deleteClass(classID);
        if (deleteResponse.error) {
            alert(`❌ Failed to delete class: ${deleteResponse.error}`);
            return;
        }
        // Update local state: remove the deleted class
        const updatedClasses = classes.filter(cls => (cls.id || cls.classID) !== classID);
        setClasses(updatedClasses);
        alert(`✅ ${deleteClassData.className} deleted successfully!`);
        // Reset deletion state
        setShowDeleteModal(false);
        setDeletePassword("");
        setDeleteClassData(null);
    };

    return (
        <div className='dashboard'>
            <div className={`sidebar open`}>
                <Nav className='flex-column sidebar-content'>
                    <Nav.Item className="nav-item active">
                        <Nav.Link href='#' className='nav-link'>
                            <FontAwesomeIcon icon={faDesktop} className='sidebar-icon' /> My Classes
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item className='nav-item' onClick={() => navigate('/teacher/sandbox')}>
                        <Nav.Link href='#' className='nav-link'>
                            <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Sandbox
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item className='nav-item' onClick={() => navigate('/teacher/item')}>
                        <Nav.Link href='#' className='nav-link'>
                            <FontAwesomeIcon icon={faLaptopCode} className='sidebar-icon' /> Item Bank
                        </Nav.Link>
                    </Nav.Item>
                </Nav>
            </div>

            <div className='dashboard-content'>
                <Navbar expand='lg' fixed='top' className='navbar-top'>
                    <Button variant='transparent' className='toggle-btn'>
                        <FontAwesomeIcon icon={faBars} />
                    </Button>
                    <div className='dashboard-navbar'>
                        <span className='ping'>20 ms</span>
                        <a href='#'><i className='bi bi-moon'></i></a>
                        <span className='student-badge'>Teacher</span>
                        <Dropdown align='end'>
                            <Dropdown.Toggle variant='transparent' className='profile-dropdown'>
                                <img src={profileImage} className='profile-image' alt="Profile" />
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item onClick={() => navigate('/teacher/profile')}>Profile Account</Dropdown.Item>
                                <Dropdown.Item onClick={handleLogout}>Log Out</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                </Navbar>

                <div className='container dashboard-body'>
                    <h5>Active Classes</h5>
                    <div className='classes-container'>
                        {classes.map((classItem, index) => (
                            <Card className='class-card' key={index}
                                onClick={() => {
                                    sessionStorage.setItem("selectedClassID", classItem.id || classItem.classID);
                                    navigate(`/teacher/class/${classItem.id || classItem.classID}/activity`);
                                }}
                                style={{ position: 'relative', cursor: 'pointer' }}>
                                <Card.Img variant='top' src='/src/assets/univ.png' />
                                {/* Dropdown options */}
                                <div className="card-options" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                    <Dropdown onClick={(e) => e.stopPropagation()}>
                                        <Dropdown.Toggle
                                            style={{
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                boxShadow: 'none',
                                                padding: '0'
                                            }}
                                            id={`dropdown-${index}`}>
                                            <FontAwesomeIcon icon={faEllipsisV} />
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            <Dropdown.Item onClick={(e) => handleEditClass(classItem, e)}>Edit</Dropdown.Item>
                                            <Dropdown.Item onClick={(e) => handleDeleteClass(classItem, e)}>Delete</Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </div>
                                <Card.Body>
                                    <Card.Text>
                                        <strong><h6>{classItem.className}</h6></strong>
                                        <strong>Section:</strong> {classItem.classSection} <br />
                                        <strong>Teacher:</strong> {classItem.instructorName || instructorName}
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        ))}

                        <Button variant='transparent' className='create-class' onClick={() => setShowCreateClass(true)}>
                            + Create a Class
                        </Button>
                    </div>
                </div>

                {/* Create Class Modal */}
                <Modal className='modal-create-class' show={showCreateClass} onHide={() => setShowCreateClass(false)} backdrop='static' keyboard={false} size='lg'>
                    <Modal.Header closeButton>
                        <Modal.Title>Class Creation</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={handleClassCreate}>
                            <Form.Group controlId='formClassName'>
                                <Form.Label>Class Name</Form.Label>
                                <Form.Control
                                    type='text'
                                    placeholder='Enter class name'
                                    value={className}
                                    onChange={(e) => setClassName(e.target.value)}
                                    required
                                />
                            </Form.Group>
                            <Form.Group controlId='formClassSection' className='mt-3'>
                                <Form.Label>Class Section</Form.Label>
                                <Form.Control
                                    type='text'
                                    placeholder='Enter class section'
                                    value={classSection}
                                    onChange={(e) => setClassSection(e.target.value)}
                                    required
                                />
                            </Form.Group>
                            <Button variant='primary' className='mt-3' type="submit" disabled={isCreating}>
                                {isCreating ? "Creating..." : "Create Class"}
                            </Button>
                        </Form>
                    </Modal.Body>
                </Modal>

                {/* Edit Class Modal */}
                <Modal className='modal-edit-class' show={showEditModal} onHide={() => setShowEditModal(false)} backdrop='static' keyboard={false} size='lg'>
                    <Modal.Header closeButton>
                        <Modal.Title>Edit Class</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={handleEditClassSave}>
                            <Form.Group controlId='formEditClassName'>
                                <Form.Label>Class Name</Form.Label>
                                <Form.Control
                                    type='text'
                                    placeholder='Enter class name'
                                    value={editClassData.className}
                                    onChange={(e) => setEditClassData({ ...editClassData, className: e.target.value })}
                                    required
                                />
                            </Form.Group>
                            <Form.Group controlId='formEditClassSection' className='mt-3'>
                                <Form.Label>Class Section</Form.Label>
                                <Form.Control
                                    type='text'
                                    placeholder='Enter class section'
                                    value={editClassData.classSection}
                                    onChange={(e) => setEditClassData({ ...editClassData, classSection: e.target.value })}
                                    required
                                />
                            </Form.Group>
                            <Button variant='primary' className='mt-3' type="submit" disabled={isEditing}>
                                {isEditing ? "Saving..." : "Save Changes"}
                            </Button>
                        </Form>
                    </Modal.Body>
                </Modal>

                {/* Delete Class Modal */}
                <Modal className='modal-delete-class' show={showDeleteModal} onHide={() => setShowDeleteModal(false)} backdrop='static' keyboard={false} size='lg'>
                    <Modal.Header closeButton>
                        <Modal.Title>Confirm Deletion</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p>Please enter your password to confirm deletion of <strong>{deleteClassData?.className}</strong>.</p>
                        <Form onSubmit={handleDeleteClassConfirm}>
                            <Form.Group controlId='formDeletePassword'>
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type='password'
                                    placeholder='Enter your password'
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    required
                                />
                            </Form.Group>
                            <div className='d-flex justify-content-end mt-3'>
                                <Button variant='secondary' onClick={() => setShowDeleteModal(false)} className='me-2'>
                                    Cancel
                                </Button>
                                <Button variant='danger' type="submit">
                                    Delete Class
                                </Button>
                            </div>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};
