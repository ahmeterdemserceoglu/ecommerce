import 'package:flutter/material.dart';
import '../utils/theme.dart';
import '../screens/dashboard_screen.dart' as dashboard;
import '../screens/users_screen.dart';
import '../screens/stores_screen.dart';
import '../screens/products_screen.dart';
import '../screens/categories_screen.dart';
import '../screens/coupons_screen.dart';
import '../screens/announcements_screen.dart';
import '../screens/seller_applications_screen.dart';
import '../screens/payout_requests_screen.dart';
import '../screens/orders_screen.dart';
import '../screens/tables_browser_screen.dart' as tables;
import '../screens/settings_screen.dart';

class AdminLayout extends StatelessWidget {
  final Widget child;
  final int selectedIndex;
  final Function(int) onMenuTap;

  const AdminLayout({
    Key? key,
    required this.child,
    required this.selectedIndex,
    required this.onMenuTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final menuItems = [
      {'icon': Icons.dashboard, 'label': 'Dashboard'},
      {'icon': Icons.people, 'label': 'Kullanıcılar'},
      {'icon': Icons.store, 'label': 'Mağazalar'},
      {'icon': Icons.shopping_bag, 'label': 'Ürünler'},
      {'icon': Icons.category, 'label': 'Kategoriler'},
      {'icon': Icons.card_giftcard, 'label': 'Kuponlar'},
      {'icon': Icons.campaign, 'label': 'Duyurular'},
      {'icon': Icons.assignment_ind, 'label': 'Satıcı Başvuruları'},
      {'icon': Icons.payments, 'label': 'Ödeme Talepleri'},
      {'icon': Icons.receipt_long, 'label': 'Siparişler'},
      {'icon': Icons.storage, 'label': 'Veritabanı'},
      {'icon': Icons.settings, 'label': 'Ayarlar'},
    ];

    return Row(
      children: [
        // Sidebar
        Container(
          width: 220,
          color: AdminTheme.white,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 32),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: RichText(
                  text: TextSpan(
                    children: [
                      TextSpan(
                        text: 'HD',
                        style: TextStyle(
                          color: AdminTheme.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 22,
                        ),
                      ),
                      TextSpan(
                        text: 'Ticaret',
                        style: TextStyle(
                          color: AdminTheme.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 22,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),
              ...List.generate(menuItems.length, (index) {
                final item = menuItems[index];
                final isSelected = selectedIndex == index;
                return Material(
                  color: isSelected ? AdminTheme.lightGrey : Colors.transparent,
                  child: InkWell(
                    onTap: () => onMenuTap(index),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 24, vertical: 12),
                      child: Row(
                        children: [
                          Icon(
                            item['icon'] as IconData,
                            color: isSelected
                                ? AdminTheme.primary
                                : AdminTheme.black,
                          ),
                          const SizedBox(width: 16),
                          Text(
                            item['label'] as String,
                            style: TextStyle(
                              color: isSelected
                                  ? AdminTheme.primary
                                  : AdminTheme.black,
                              fontWeight: isSelected
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
        // Main Content
        Expanded(
          child: Column(
            children: [
              // Top Bar
              Container(
                height: 64,
                color: AdminTheme.white,
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  children: [
                    // Arama kutusu
                    Expanded(
                      child: Container(
                        height: 40,
                        decoration: BoxDecoration(
                          color: AdminTheme.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AdminTheme.borderGrey),
                        ),
                        child: Row(
                          children: [
                            const SizedBox(width: 8),
                            const Icon(Icons.search, color: Colors.grey),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                decoration: const InputDecoration(
                                  hintText: 'Ürün, kategori veya mağaza ara...',
                                  border: InputBorder.none,
                                  isDense: true,
                                ),
                              ),
                            ),
                            Container(
                              margin: const EdgeInsets.only(right: 4),
                              child: ElevatedButton(
                                onPressed: () {},
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AdminTheme.primary,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 0),
                                ),
                                child: const Icon(Icons.search,
                                    color: Colors.white),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 24),
                    const Icon(Icons.shopping_cart_outlined),
                    const SizedBox(width: 16),
                    const Icon(Icons.notifications_none),
                    const SizedBox(width: 16),
                    const CircleAvatar(
                      backgroundColor: AdminTheme.primary,
                      child: Icon(Icons.person, color: Colors.white),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Admin Panel',
                      style: TextStyle(
                        color: AdminTheme.black,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
              // Page Content
              Expanded(child: child),
            ],
          ),
        ),
      ],
    );
  }
}

class AdminHome extends StatefulWidget {
  const AdminHome({Key? key}) : super(key: key);

  @override
  State<AdminHome> createState() => _AdminHomeState();
}

class _AdminHomeState extends State<AdminHome> {
  int selectedIndex = 0;

  final List<Widget> screens = [
    dashboard.DashboardScreen(),
    UsersScreen(),
    StoresScreen(),
    ProductsScreen(),
    CategoriesScreen(),
    CouponsScreen(),
    AnnouncementsScreen(),
    SellerApplicationsScreen(),
    PayoutRequestsScreen(),
    OrdersScreen(),
    tables.DatabaseScreen(),
    SettingsScreen(),
  ];

  void onMenuTap(int index) {
    setState(() {
      selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AdminLayout(
      child: screens[selectedIndex],
      selectedIndex: selectedIndex,
      onMenuTap: onMenuTap,
    );
  }
}
