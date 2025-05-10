import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/products_provider.dart';
import '../providers/orders_provider.dart';
import '../providers/stores_provider.dart';
import '../providers/database_provider.dart';
import '../widgets/app_drawer.dart';
import '../widgets/dashboard/stats_card.dart';
import '../widgets/dashboard/recent_products.dart';
import '../widgets/dashboard/recent_orders.dart';
import '../utils/constants.dart';
import '../utils/responsive.dart';
import '../screens/database_screen.dart';
import '../screens/tables_browser_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isLoading = true;
  Map<String, dynamic> _stats = {};
  Map<String, dynamic> _dbHealth = {};
  bool _isLoadingDbHealth = false;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
    _loadDatabaseHealth();
  }

  Future<void> _loadDashboardData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Load products stats
      final productsProvider =
          Provider.of<ProductsProvider>(context, listen: false);
      final productStats = await productsProvider.getProductStats();

      // Load orders stats
      final ordersProvider =
          Provider.of<OrdersProvider>(context, listen: false);
      final orderStats = await ordersProvider.getOrderStats();

      // Load stores stats
      final storesProvider =
          Provider.of<StoresProvider>(context, listen: false);
      final storeStats = await storesProvider.getStoreStats();

      setState(() {
        _stats = {
          'products': productStats,
          'orders': orderStats,
          'stores': storeStats,
        };
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load dashboard data: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _loadDatabaseHealth() async {
    setState(() {
      _isLoadingDbHealth = true;
    });

    try {
      final databaseProvider =
          Provider.of<DatabaseProvider>(context, listen: false);
      await databaseProvider.checkDatabaseHealth();
      setState(() {
        _dbHealth = databaseProvider.healthStats;
        _isLoadingDbHealth = false;
      });
    } catch (e) {
      setState(() {
        _isLoadingDbHealth = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Yönetim Paneli'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              _loadDashboardData();
              _loadDatabaseHealth();
            },
            tooltip: 'Yenile',
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              Provider.of<AuthProvider>(context, listen: false).logout();
            },
            tooltip: 'Çıkış Yap',
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () async {
                await _loadDashboardData();
                await _loadDatabaseHealth();
              },
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Yönetim Paneline Hoş Geldiniz',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),

                    const SizedBox(height: 8),

                    Text(
                      'Bugün mağazanızda neler oluyor?',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),

                    const SizedBox(height: 24),

                    // Stats cards
                    Responsive(
                      mobile: _buildStatsCards(crossAxisCount: 1),
                      tablet: _buildStatsCards(crossAxisCount: 2),
                      desktop: _buildStatsCards(crossAxisCount: 4),
                    ),

                    const SizedBox(height: 24),

                    // Database management card
                    _buildDatabaseCard(),

                    const SizedBox(height: 24),

                    // Recent products and orders
                    const Responsive(
                      mobile: Column(
                        children: [
                          RecentProducts(),
                          SizedBox(height: 24),
                          RecentOrders(),
                        ],
                      ),
                      tablet: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            flex: 1,
                            child: RecentProducts(),
                          ),
                          SizedBox(width: 24),
                          Expanded(
                            flex: 1,
                            child: RecentOrders(),
                          ),
                        ],
                      ),
                      desktop: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            flex: 3,
                            child: RecentProducts(),
                          ),
                          SizedBox(width: 24),
                          Expanded(
                            flex: 2,
                            child: RecentOrders(),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildStatsCards({required int crossAxisCount}) {
    final stats = [
      StatsCard(
        title: 'Toplam Ürün',
        value: _stats['products']?['totalCount']?.toString() ?? '0',
        icon: Icons.shopping_bag,
        color: Colors.blue,
        subtitle: '${_stats['products']?['pendingCount'] ?? 0} onay bekliyor',
      ),
      StatsCard(
        title: 'Bugünkü Siparişler',
        value: _stats['orders']?['todayCount']?.toString() ?? '0',
        icon: Icons.receipt_long,
        color: Colors.orange,
        subtitle:
            '${_stats['orders']?['todayRevenue'] != null ? '${_stats['orders']?['todayRevenue']}₺' : '0₺'} ciro',
      ),
      StatsCard(
        title: 'Aktif Mağaza',
        value: _stats['stores']?['activeCount']?.toString() ?? '0',
        icon: Icons.store,
        color: Colors.green,
        subtitle: '${_stats['stores']?['pendingCount'] ?? 0} onay bekliyor',
      ),
      StatsCard(
        title: 'Toplam Ciro',
        value: _stats['orders']?['totalRevenue'] != null
            ? '${_stats['orders']?['totalRevenue']}₺'
            : '0₺',
        icon: Icons.attach_money,
        color: Colors.purple,
        subtitle: 'Tüm zamanlar',
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 1.5,
      ),
      itemCount: stats.length,
      itemBuilder: (context, index) => stats[index],
    );
  }

  Widget _buildDatabaseCard() {
    final dbStatus = _dbHealth['status'] ?? 'unknown';
    final statusColor = dbStatus == 'healthy'
        ? Colors.green
        : dbStatus == 'warning'
            ? Colors.orange
            : Colors.red;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Veritabanı Yönetimi',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                if (_isLoadingDbHealth)
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
            const Divider(),
            Responsive(
              mobile: Column(
                children: [
                  _buildDatabaseHealthInfo(statusColor),
                  const SizedBox(height: 16),
                  _buildDatabaseButtons(),
                ],
              ),
              tablet: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(child: _buildDatabaseHealthInfo(statusColor)),
                  const SizedBox(width: 16),
                  _buildDatabaseButtons(),
                ],
              ),
              desktop: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(child: _buildDatabaseHealthInfo(statusColor)),
                  const SizedBox(width: 16),
                  _buildDatabaseButtons(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDatabaseHealthInfo(Color statusColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: statusColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'Durum: ${(_dbHealth['status'] ?? 'Bilinmiyor').toUpperCase()}',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: statusColor,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text('Tablo Sayısı: ${_dbHealth['tablesCount'] ?? 'N/A'}'),
        const SizedBox(height: 4),
        Text('Toplam Satır: ${_dbHealth['totalRows'] ?? 'N/A'}'),
        const SizedBox(height: 4),
        Text('Son Yedekleme: ${_dbHealth['lastBackup'] ?? 'Hiç'}'),
      ],
    );
  }

  Widget _buildDatabaseButtons() {
    return Column(
      children: [
        ElevatedButton.icon(
          icon: const Icon(Icons.storage),
          label: const Text('Veritabanı Araçları'),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const DatabaseScreen()),
            );
          },
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(200, 40),
          ),
        ),
        const SizedBox(height: 8),
        ElevatedButton.icon(
          icon: const Icon(Icons.table_chart),
          label: const Text('Tabloları Görüntüle'),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const TablesBrowserScreen()),
            );
          },
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(200, 40),
          ),
        ),
      ],
    );
  }
}
