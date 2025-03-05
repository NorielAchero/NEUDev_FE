import React, { useState, useEffect } from 'react';
import '/src/style/teacher/cmBulletin.css';
import { Button, Row, Col, Card, Modal, Form, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBold, faItalic, faUnderline, faSuperscript, 
  faAlignLeft, faAlignCenter, faAlignRight, faEllipsisH 
} from '@fortawesome/free-solid-svg-icons';
import TeacherCMNavigationBarComponent from './TeacherCMNavigationBarComponent';
import { createBulletinPost, getBulletinPosts, deleteBulletinPost } from '../api/API.js';
import { useParams } from 'react-router-dom';

export const TeacherClassManagementBulletinComponent = () => {
  // Get the classID from the URL parameters.
  const { classID } = useParams();

  // State to hold bulletin posts.
  const [posts, setPosts] = useState([]);

  const [concerns] = useState([
      { id: 1, name: 'Angelica Mae Manliguez', dateCreated: '12 August 2025', timeCreated: '7:30pm', message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { id: 2, name: 'Hannah Condada', dateCreated: '14 February 2025', timeCreated: '7:30am', message: 'sir bat ganto' },
      { id: 3, name: 'Erikka Enaje', dateCreated: '19 December 2025', timeCreated: '9:30am', message: 'ma anong ulam' }
  ]);

  const [showResponse, setShowResponse] = useState(false);
  const [showPostAnnouncement, setShowPostAnnouncement] = useState(false);
  // State for delete confirmation modal.
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // Holds the post id to be deleted.
  const [postToDelete, setPostToDelete] = useState(null);
  
  // States for new post title and message.
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostMessage, setNewPostMessage] = useState('');

  // Fetch existing posts on component mount or when classID changes.
  useEffect(() => {
    const fetchPosts = async () => {
      if (!classID) {
        console.error("Class ID not found in URL parameters.");
        return;
      }
      const response = await getBulletinPosts(classID);
      if (response.error) {
        console.error("Error fetching posts:", response.error);
      } else {
        // Map the API response to match our post object structure.
        const fetchedPosts = response.map(post => ({
          id: post.id,
          title: post.title,
          message: post.message,
          dateCreated: new Date(post.created_at).toLocaleDateString(),
          timeCreated: new Date(post.created_at).toLocaleTimeString()
        }));
        setPosts(fetchedPosts);
      }
    };

    fetchPosts();
  }, [classID]);

  // Function to delete a post (calls the API and updates UI if successful).
  const handleDeletePost = async (id) => {
    // Call the API to delete the post from the backend.
    const response = await deleteBulletinPost(id);
    if (response.error) {
      console.error("Error deleting post:", response.error);
      alert("❌ Error deleting post. Please try again.");
    } else {
      setPosts(posts.filter(post => post.id !== id));
      alert("✅ Post deleted successfully!");
    }
    setShowDeleteModal(false);
  };

  // Handler to open delete confirmation modal.
  const confirmDelete = (id) => {
    setPostToDelete(id);
    setShowDeleteModal(true);
  };

  // Handler to create a new bulletin post.
  const handleCreatePost = async () => {
    if (!classID) {
      console.error("Class ID not found in URL parameters.");
      return;
    }
    
    // Call the API to create the bulletin post.
    const response = await createBulletinPost(classID, newPostTitle, newPostMessage);
    if (response.error) {
      console.error("Error creating post:", response.error);
      alert("❌ Error creating post. Please try again.");
      return;
    }

    // Create a new post object from the API response.
    const newPost = {
      id: response.id,
      title: response.title,
      message: response.message,
      dateCreated: new Date(response.created_at).toLocaleDateString(),
      timeCreated: new Date(response.created_at).toLocaleTimeString()
    };

    // Update posts state with the new post added at the beginning.
    setPosts([newPost, ...posts]);

    // Clear the modal fields, close the modal and show a success alert.
    setNewPostTitle('');
    setNewPostMessage('');
    setShowPostAnnouncement(false);
    alert("✅ Post created successfully!");
  };

  return (
    <>
      <TeacherCMNavigationBarComponent/>
      <div className='bulletin-content'>
        <div className="create-new-activity-wrapper"></div> 
        <div className="create-new-activity-container">
          <button className="create-new-activity-button" onClick={() => setShowPostAnnouncement(true)}>
            + Create New Post
          </button>

          <Modal className='modal-post-announcement' show={showPostAnnouncement} onHide={() => setShowPostAnnouncement(false)} backdrop='static' keyboard={false} size='md'>
            <Modal.Header closeButton>
              <h3>Create a Post</h3>
            </Modal.Header>
            <Modal.Body>
              <Form className='create-activity-form'>
                <Form.Control 
                  className='create-activity-title' 
                  type='text' 
                  placeholder='Title...' 
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                />
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
                    value={newPostMessage}
                    onChange={(e) => setNewPostMessage(e.target.value)}
                  />
                </div>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={handleCreatePost}>Post</Button>
            </Modal.Footer>
          </Modal>
        </div>
        
        <Row>
          <Col></Col>
          <Col xs={7}>
            <div className='announcement'>
              <div className='announcement-header'>
                <h5>Professor's Announcements</h5>
              </div>
              {posts.map((post) =>
                <Card className='post-card' style={{ borderRadius: "20px" }} key={post.id}>
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <div>
                      <h2>{post.title}</h2>
                      <p>Posted on {post.dateCreated} {post.timeCreated}</p>
                    </div>
                    <Dropdown>
                      <Dropdown.Toggle variant="link" id="dropdown-basic">
                        <FontAwesomeIcon icon={faEllipsisH} />
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item onClick={() => confirmDelete(post.id)}>Delete</Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </Card.Header>
                  <Card.Body>
                    <p>{post.message}</p>
                  </Card.Body>
                </Card>
              )}
            </div>
          </Col>
          <Col xs={3}>
            <div className='concern'>
              <div className='concern-header'>
                <h5>Student Concerns</h5>
              </div>
              <div className='concern-body'>
                {concerns.map((concern) =>
                  <div className='concern-details' key={concern.id}>
                    <h6>{concern.name}</h6>
                    <p>Created on {concern.dateCreated} {concern.timeCreated}</p>
                    <p className='concern-message'>{concern.message}</p>
                    <div className='concern-actions'>
                      <p>Pending</p>
                      <p>Reply<i className='bi bi-reply-fill' onClick={() => setShowResponse(true)}/></p>
                    </div>
                  </div>
                )}
                <Modal className='post-concern' show={showResponse} onHide={() => setShowResponse(false)} backdrop='static' keyboard={false} size='md'>
                  <Modal.Header closeButton>
                    <div className='modal-activity-header'>
                      <h3>Send Your Response</h3>
                      <p>To student, Hanna Condada</p>
                    </div>
                  </Modal.Header>
                  <Modal.Body>
                    <textarea className='post-concern-textarea'></textarea>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button onClick={() => setShowResponse(false)}>Send Response</Button>
                  </Modal.Footer>
                </Modal>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteModal} 
        onHide={() => setShowDeleteModal(false)} 
        backdrop='static' 
        keyboard={false} 
        size='sm'
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this post?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            No
          </Button>
          <Button variant="danger" onClick={() => handleDeletePost(postToDelete)}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
