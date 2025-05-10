import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/splash_screen.dart';
import 'providers/auth_provider.dart';
import 'providers/products_provider.dart';
import 'providers/orders_provider.dart';
import 'providers/stores_provider.dart';
import 'providers/database_provider.dart';
import 'providers/category_provider.dart';
import 'utils/theme.dart';
import 'services/auth_service.dart';
import 'services/api_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final authService = AuthService();
  final apiService = ApiService();

  runApp(MyApp(authService: authService, apiService: apiService));
}

class MyApp extends StatelessWidget {
  final AuthService authService;
  final ApiService apiService;

  const MyApp({Key? key, required this.authService, required this.apiService})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
            create: (_) =>
                AuthProvider(authService: authService, apiService: apiService)),
        ChangeNotifierProvider(
            create: (_) => ProductsProvider(apiService: apiService)),
        ChangeNotifierProvider(
            create: (_) => OrdersProvider(apiService: apiService)),
        ChangeNotifierProvider(create: (_) => StoresProvider()),
        ChangeNotifierProvider(create: (_) => DatabaseProvider()),
        ChangeNotifierProvider(
            create: (_) => CategoryProvider(apiService: apiService)),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return MaterialApp(
            title: 'Admin Dashboard',
            theme: AdminTheme.theme,
            debugShowCheckedModeBanner: false,
            home: const SplashScreen(),
          );
        },
      ),
    );
  }
}
