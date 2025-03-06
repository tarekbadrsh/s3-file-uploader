// Configuration - Update these values
const API_URL = 'http://localhost:3000';
const JWT_TOKEN = 'YOUR_JWT_TOKEN'; // Should be obtained from an authentication service

/**
 * Upload a file to the server with progress tracking
 * @param {File} file - The file to upload
 * @returns {Promise<Object>} - Response from the server
 */
async function uploadFile(file) {
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

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

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
        xhr.send(formData);

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

        // Disable button during upload
        uploadButton.disabled = true;

        try {
            await uploadFile(file);
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
document.addEventListener('DOMContentLoaded', initializeUpload);