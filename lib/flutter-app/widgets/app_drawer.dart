import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../screens/dashboard_screen.dart';
import '../screens/products_screen.dart';
import '../screens/stores_screen.dart';
import '../screens/users_screen.dart';
import '../screens/orders_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/database_screen.dart' as db;
import '../screens/tables_browser_screen.dart' as tb;
import '../utils/responsive.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.currentUser;

    // If we're on a large screen, we want the drawer to be permanent
    if (Responsive.isDesktop(context)) {
      return Drawer(
        child: _buildDrawerContent(
            context, user?.name ?? 'Admin', user?.email ?? ''),
      );
    }

    return Drawer(
      child: _buildDrawerContent(
          context, user?.name ?? 'Admin', user?.email ?? ''),
    );
  }

  Widget _buildDrawerContent(BuildContext context, String name, String email) {
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        DrawerHeader(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const CircleAvatar(
                radius: 30,
                backgroundColor: Colors.white,
                child: Icon(
                  Icons.person,
                  size: 30,
                  color: Colors.blue,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                name,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                email,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
        _buildDrawerItem(
          context,
          icon: Icons.dashboard,
          title: 'Dashboard',
          onTap: () {
            Navigator.pop(context);
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (context) => const DashboardScreen()),
            );
          },
        ),
        _buildDrawerItem(
          context,
          icon: Icons.shopping_bag,
          title: 'Products',
          onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const ProductsScreen()),
            );
          },
        ),
        _buildDrawerItem(
          context,
          icon: Icons.store,
          title: 'Stores',
          onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const StoresScreen()),
            );
          },
        ),
        _buildDrawerItem(
          context,
          icon: Icons.receipt_long,
          title: 'Orders',
          onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const OrdersScreen()),
            );
          },
        ),
        _buildDrawerItem(
          context,
          icon: Icons.people,
          title: 'Users',
          onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const UsersScreen()),
            );
          },
        ),
        const Divider(),
        _buildDrawerSubheader(context, 'Database Tools'),
        _buildDrawerItem(
          context,
          icon: Icons.storage,
          title: 'Database Management',
          onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (context) => const db.DatabaseScreen()),
            );
          },
        ),
        _buildDrawerItem(
          context,
          icon: Icons.table_chart,
          title: 'Tables Browser',
          onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (context) => const tb.TablesBrowserScreen()),
            );
          },
        ),
        const Divider(),
        _buildDrawerItem(
          context,
          icon: Icons.settings,
          title: 'Settings',
          onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const SettingsScreen()),
            );
          },
        ),
        _buildDrawerItem(
          context,
          icon: Icons.logout,
          title: 'Logout',
          onTap: () {
            showDialog(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('Logout'),
                content: const Text('Are you sure you want to logout?'),
                actions: [
                  TextButton(
                    child: const Text('Cancel'),
                    onPressed: () => Navigator.pop(context),
                  ),
                  TextButton(
                    child: const Text('Logout'),
                    onPressed: () {
                      Navigator.pop(context);
                      Provider.of<AuthProvider>(context, listen: false)
                          .logout();
                    },
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildDrawerSubheader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Text(
        title,
        style: TextStyle(
          color: Theme.of(context).colorScheme.primary,
          fontWeight: FontWeight.bold,
          fontSize: 14,
        ),
      ),
    );
  }

  Widget _buildDrawerItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color: Theme.of(context).colorScheme.primary,
      ),
      title: Text(title),
      onTap: onTap,
    );
  }
}
