SnapMart Server (MERN Stack with Azure Cloud Services)

This project contains the robust backend server for the SnapMart Point-of-Sale (POS) application, built on the MERN stack and integrated deeply with Azure Cloud Services for scalable operations.

It features specific components for serverless processing and containerized deployment, showcasing expertise in modern cloud architecture.

⚙️ Prerequisites

Node.js (LTS recommended)

npm or yarn

🚀 Installation & Setup

Install Dependencies:

npm install


Configure Environment: Create a file named .env in the root directory of the server.

Populate .env File: This file must contain the following configuration variables. These keys are crucial for connecting to Firebase Authentication, MongoDB, and your Azure cloud resources (Blob Storage and Queues).

Variable

Description

Purpose

PORT

The port on which the Express server will run.

Local access point for the API.

MONGODB_URI

The connection string for your MongoDB database (e.g., MongoDB Atlas).

Primary database connection for business logic and data.

FIREBASE_SERVICE_ACCOUNT_KEY

The full JSON content of your Firebase service account key.

Used for backend validation and secure authentication.

AZURE_STORAGE_CONNECTION_STRING

The connection string for the Azure Storage Account.

Grants access to Azure Blob Storage (for images) and Azure Queues (for messaging).

AZURE_CONTAINER_NAME

The specific name of the Azure Blob container used for storing uploaded images.

Specifies the target location for media assets.

Example .env structure:

FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "...", ...}'
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
AZURE_CONTAINER_NAME="snapmart-images"
PORT=3000
MONGODB_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/SnapMart"


Run the Server:

npm run dev


The server should now be running and ready to handle API requests.
