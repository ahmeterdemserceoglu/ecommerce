# Flutter Admin App with Supabase Integration

This is a Flutter admin application that integrates with your existing API endpoints and Supabase to manage your e-commerce platform. It provides admin features to manage products, stores, orders, users, and database operations.

## Setup Instructions

### 1. Configure Supabase

1. Visit [Supabase.com](https://supabase.com) and create an account if you don't have one.
2. Create a new project.
3. Get your Supabase URL and anon key from the API settings.
4. Update the Supabase configuration in `lib/services/supabase_service.dart`:

```dart
static const String supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your URL
static const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your key
```

### 2. Configure API Endpoint

Update the API base URL in `lib/utils/constants.dart` to point to your server:

```dart
const String apiBaseUrl = 'https://your-api-domain.com'; // Change this
```

### 3. Install Dependencies

Ensure you have all required dependencies:

```bash
flutter pub get
```

### 4. Run the App

```bash
flutter run
```

## Project Structure

- `lib/main.dart` - Main entry point
- `lib/models/` - Data models
- `lib/screens/` - App screens
- `lib/widgets/` - Reusable UI components
- `lib/services/` - API services
- `lib/providers/` - State management
- `lib/utils/` - Utility functions and constants

## Features

- **Authentication** - Login with admin credentials through API or Supabase
- **Dashboard** - Overview of store performance
- **Products Management** - View, approve, reject, edit products
- **Orders Management** - View, update status, process refunds
- **Stores Management** - Approve or reject store applications
- `lib/services/supabase_service.dart` - Supabase integration
- **Users Management** - View and manage user accounts
- **Settings** - Configure app settings
- **Database Management** - Direct database operations with Supabase integration

## Database Features

The admin app now includes advanced database management features:

- Execute raw SQL queries directly against your Supabase database
- View database health statistics
- Update database schema and functions
- Create database backups
- View table schemas and structure

## Authentication

The app uses a hybrid authentication approach:

1. Attempts to authenticate using Supabase first
2. Falls back to API authentication if Supabase is unavailable
3. Securely stores authentication tokens using Flutter Secure Storage

## API Integration

This app is designed to work with your existing API endpoints. The services in the `lib/services/` directory handle all API calls, with Supabase integration as a primary option when available.

## State Management

The app uses Provider package for state management. Each major feature has its own provider class that handles the state and business logic for that feature.

## UI Components

The UI is built with Material Design components and follows responsive design principles to work on both mobile and tablet layouts.

## Customization

You can customize the app by:

1. Modifying the theme in `lib/utils/theme.dart`
2. Adding new screens or features
3. Extending the database functionality in the Supabase service
4. Creating additional database management screens

## Troubleshooting

Common issues and solutions:

1. **Supabase Connection Issues**: Check your Supabase URL and anon key in the configuration
2. **API Connection Issues**: Verify the API base URL in constants.dart
3. **Authentication Problems**: Check that Supabase authentication is properly configured
4. **Database Errors**: Check the database functions in your Supabase project

## Security Note

This admin app has access to execute direct SQL queries against your database. Make sure to:

1. Only distribute this app to trusted administrators
2. Set up proper row-level security in Supabase
3. Configure appropriate database roles and permissions
4. Never expose the anon key in public-facing applications

## Need Help?

If you need help with this admin app, please contact your system administrator. 