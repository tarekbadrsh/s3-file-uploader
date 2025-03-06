// Configuration - Update these values
const API_URL = 'http://localhost:3000';
const JWT_TOKEN = 'YOUR_JWT_TOKEN'; // Should be obtained from an authentication service
const PROJECT_ID = 'DEFAULT_PROJECT_ID'; // Update this with your project ID or get it dynamically
const HEALTH_CHECK_INTERVAL = 60 * 1000; // 1 minute in milliseconds

/**
 * Update the API health status indicator
 * @param {boolean} isHealthy - Whether the API is healthy
 */
function updateHealthIndicator(isHealthy) {
    const indicator = document.getElementById('apiHealthIndicator');
    const statusText = document.getElementById('apiHealthText');

    if (!indicator) return;

    // Update class and tooltip
    if (isHealthy) {
        indicator.classList.remove('unhealthy');
        indicator.classList.add('healthy');
        indicator.setAttribute('title', 'API is online');
        if (statusText) {
            statusText.textContent = 'Online';
            statusText.style.color = '#2ecc71';
        }
    } else {
        indicator.classList.remove('healthy');
        indicator.classList.add('unhealthy');
        indicator.setAttribute('title', 'API is offline');
        if (statusText) {
            statusText.textContent = 'Offline';
            statusText.style.color = '#e74c3c';
        }
    }
}

/**
 * Start monitoring API health
 */
function startHealthMonitoring() {
    // Check immediately on startup
    checkApiHealth().then(isHealthy => {
        console.log('Initial API health status:', isHealthy ? 'online' : 'offline');
        updateHealthIndicator(isHealthy);
    });

    // Set up interval for regular checks - every 10 minutes
    console.log('Setting up health check interval every', HEALTH_CHECK_INTERVAL / 60000, 'minutes');

    // Use a named interval so we can debug it if needed
    const healthInterval = setInterval(async () => {
        console.log('Running scheduled health check...');
        const isHealthy = await checkApiHealth();
        console.log('API health status:', isHealthy ? 'online' : 'offline');
        updateHealthIndicator(isHealthy);
    }, HEALTH_CHECK_INTERVAL);

    // Store the interval ID on window for debugging
    window.healthCheckInterval = healthInterval;
}

/**
 * Check if the API is still live
 * @returns {Promise<boolean>} - True if API is live, false otherwise
 */
async function checkApiHealth() {
    try {
        const response = await fetch(`${API_URL}/health`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`
            }
        });

        if (response.ok) {
            console.log('API is healthy');
            return true;
        } else {
            console.error('API health check failed with status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('API health check error:', error);
        return false;
    }
}

/**
 * Upload a file to the server with progress tracking
 * @param {File} file - The file to upload
 * @param {string} projectId - The project ID
 * @returns {Promise<Object>} - Response from the server
 */
async function uploadFile(file, projectId) {
    // Validate file
    if (!file) {
        throw new Error('No file selected');
    }

    // Check file size (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Log file information for debugging
    console.log('Uploading file:', file.name, file.type, file.size);

    // Create and show progress elements
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const filePreview = document.getElementById('filePreview');
    const uploadResult = document.getElementById('uploadResult');

    // Reset UI elements
    progressContainer.style.display = 'block';
    progressBar.value = 0;
    progressText.textContent = '0%';
    uploadResult.innerHTML = '';

    // Show file preview for images
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            filePreview.innerHTML = `<img src="${e.target.result}" alt="${file.name}" class="preview-image">`;
            filePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        filePreview.innerHTML = `<div class="file-icon">${getFileTypeIcon(file.type)}<span>${file.name}</span></div>`;
        filePreview.style.display = 'block';
    }

    try {
        // Read the file as base64
        const fileBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Get base64 string without the data URL prefix
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });

        // Prepare the request payload according to the new backend format
        const payload = {
            file: fileBase64,
            fileName: file.name,
            fileType: file.type,
            projectId: projectId
        };

        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();

        // Create a promise to handle the response
        const uploadPromise = new Promise((resolve, reject) => {
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    progressBar.value = percentComplete;
                    progressText.textContent = `${percentComplete}%`;
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        reject(new Error('Invalid server response'));
                    }
                } else {
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        reject(new Error(errorResponse.error || 'Upload failed'));
                    } catch (error) {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error during upload'));
            });

            xhr.addEventListener('abort', () => {
                reject(new Error('Upload aborted'));
            });
        });

        // Open and send the request
        xhr.open('POST', `${API_URL}/upload`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${JWT_TOKEN}`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));

        // Wait for the upload to complete
        const data = await uploadPromise;

        // Show success message
        console.log('File uploaded:', data);
        progressBar.classList.add('complete');

        // Display the uploaded file based on type
        let mediaPreview = '';
        if (data.fileType.startsWith('image/')) {
            mediaPreview = `<img src="${data.url}" alt="${data.originalName}" class="uploaded-media">`;
        } else if (data.fileType.startsWith('video/')) {
            mediaPreview = `
                <video controls class="uploaded-media">
                    <source src="${data.url}" type="${data.fileType}">
                    Your browser does not support the video tag.
                </video>
            `;
        } else if (data.fileType.startsWith('audio/')) {
            mediaPreview = `
                <audio controls>
                    <source src="${data.url}" type="${data.fileType}">
                    Your browser does not support the audio tag.
                </audio>
            `;
        }

        uploadResult.innerHTML = `
            <div class="success-message">
                <h3>Upload Successful!</h3>
                <p>File: ${data.originalName}</p>
                <p>Type: ${data.fileType}</p>
                <p>Project ID: ${data.projectId}</p>
                <p>Uploaded at: ${new Date(data.uploadedAt).toLocaleString()}</p>
                <p>CDN URL: <a href="${data.url}" target="_blank">${data.url}</a></p>
                <div class="uploaded-media-container">
                    ${mediaPreview}
                </div>
            </div>
        `;

        return data;
    } catch (error) {
        // Show error message
        console.error('Upload failed:', error);
        progressBar.classList.add('error');
        uploadResult.innerHTML = `
            <div class="error-message">
                <h3>Upload Failed</h3>
                <p>${error.message}</p>
            </div>
        `;
        throw error;
    }
}

/**
 * Get an icon based on file type
 * @param {string} fileType - MIME type
 * @returns {string} - Icon HTML
 */
function getFileTypeIcon(fileType) {
    if (fileType.startsWith('image/')) {
        return '<i class="fas fa-file-image"></i>';
    } else if (fileType === 'application/pdf') {
        return '<i class="fas fa-file-pdf"></i>';
    } else if (fileType.startsWith('text/')) {
        return '<i class="fas fa-file-alt"></i>';
    } else {
        return '<i class="fas fa-file"></i>';
    }
}

/**
 * Initialize the upload functionality
 */
function initializeUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const fileInputLabel = document.getElementById('fileInputLabel');
    const projectIdInput = document.getElementById('projectIdInput') || { value: PROJECT_ID }; // Use input or default

    // Update file input label when a file is selected
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            fileInputLabel.textContent = file.name;
            uploadButton.disabled = false;
        } else {
            fileInputLabel.textContent = 'Choose a file';
            uploadButton.disabled = true;
        }
    });

    // Handle upload button click
    uploadButton.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            alert('Please select a file first');
            return;
        }

        // Get projectId from input or use default
        const projectId = projectIdInput.value.trim() || PROJECT_ID;
        if (!projectId) {
            alert('Please enter a Project ID');
            return;
        }

        // Disable button during upload
        uploadButton.disabled = true;

        try {
            await uploadFile(file, projectId);
            // Clear file input after successful upload
            fileInput.value = '';
            fileInputLabel.textContent = 'Choose a file';
            // Also reset the upload button
            uploadButton.disabled = true;
        } catch (error) {
            // Error handling is done in uploadFile function
        } finally {
            // Re-enable button
            uploadButton.disabled = false;
        }
    });

    // Handle drag and drop
    const dropZone = document.getElementById('dropZone');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('highlight');
    }

    function unhighlight() {
        dropZone.classList.remove('highlight');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];

        if (file) {
            fileInput.files = dt.files;
            fileInputLabel.textContent = file.name;
            uploadButton.disabled = false;
        }
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize upload functionality
    initializeUpload();

    // Start API health monitoring
    startHealthMonitoring();
});