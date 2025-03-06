# S3 File Uploader

A modern, responsive web application for securely uploading files to Amazon S3.

## Features

- **Drag and Drop**: Intuitive drag-and-drop interface for file uploads
- **Progress Tracking**: Real-time upload progress indicator
- **File Preview**: Preview images before uploading
- **File Type Icons**: Visual identification of different file types
- **Responsive Design**: Works on desktop and mobile devices
- **Secure Uploads**: JWT authentication and secure file handling
- **Organized Storage**: Files are automatically organized by type in S3 (images, documents, etc.)
- **Configurable Limits**: Control file size limits and allowed file types

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js with Express (or Bun.js runtime)
- **Storage**: Amazon S3
- **Authentication**: JWT-based authentication

## Requirements

- Node.js (v14 or later) or Bun.js
- AWS Account with S3 bucket
- AWS Access Keys

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/s3-file-uploader.git
   cd s3-file-uploader
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   # Or if using Bun
   bun install
   ```

3. Create a `.env` file in the backend directory using `.env.example` as a template:
   ```
   # AWS Configuration
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=your_aws_region
   BUCKET_NAME=your_s3_bucket_name
   CDN_URL=https://your-cdn-url.com (optional)

   # CORS Configuration
   FRONTEND_URL=http://localhost:8080
   ```

## Running the Application

1. Start the backend server:
   ```bash
   cd backend
   bun server.js
   ```

2. In a new terminal, serve the frontend:
   ```bash
   cd frontend
   npx http-server -p 8080
   ```

3. Open your browser and navigate to `http://localhost:8080`

## Usage

1. Drag and drop a file onto the drop zone, or click "Choose a file" to select one
2. The file will be previewed (if it's an image) or shown with an appropriate icon
3. Click the "Upload" button to start the upload
4. The progress bar will show the upload progress in real-time
5. Once complete, a success message with the file URL will be displayed

## API Endpoints

- `GET /health`: Health check endpoint
- `POST /upload`: Upload a file to S3 (requires JWT authentication)

## Security Considerations

- The application uses JWT authentication for API endpoints
- Files are securely uploaded to S3 using AWS SDK
- Proper CORS configuration prevents unauthorized domains from accessing the API
- File size limits (default: 10MB) help prevent abuse
- File type validation ensures only allowed file types are uploaded

## Customization

You can customize various aspects of the application:

- **File Size Limits**: Modify the `limits` option in the multer configuration in `server.js`
- **Allowed File Types**: Update the `allowedTypes` array in the upload route in `server.js`
- **S3 Storage Organization**: Change the folder structure in the `Key` parameter in `server.js`
- **UI Colors**: Modify the CSS variables in the `:root` selector in `index.html`
- **API URL**: Update the `API_URL` constant in `script.js`

## Production Deployment

For production deployment, consider the following:

1. Set up proper SSL/TLS with a valid certificate
2. Configure AWS IAM roles with least privilege principle
3. Set up rate limiting to prevent abuse
4. Implement comprehensive logging and monitoring
5. Use a process manager like PM2 for Node.js application management
6. Consider using a CDN like CloudFront for serving uploaded files

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
