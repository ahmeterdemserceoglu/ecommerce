import 'package:flutter/material.dart';
import '../utils/responsive.dart';
import '../services/api_service.dart';
import '../models/order.dart';
import 'package:intl/intl.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({Key? key}) : super(key: key);

  @override
  _OrdersScreenState createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final ApiService _apiService = ApiService();
  List<Order> _orders = [];
  bool _isLoading = true;
  String _errorMessage = '';
  String _selectedStatus = 'All';
  final List<String> _statusFilters = [
    'All',
    'Pending',
    'Processing',
    'Shipped',
    'Delivered',
    'Cancelled'
  ];

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final orders = await _apiService.fetchOrders();
      setState(() {
        _orders = orders;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load orders: $e';
        _isLoading = false;
      });
    }
  }

  List<Order> get _filteredOrders {
    if (_selectedStatus == 'All') {
      return _orders;
    } else {
      return _orders.where((order) => order.status == _selectedStatus).toList();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchOrders,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage.isNotEmpty
              ? Center(child: Text(_errorMessage))
              : _orders.isEmpty
                  ? const Center(child: Text('No orders found.'))
                  : Column(
                      children: [
                        _buildStatusFilter(),
                        Expanded(
                          child: Responsive(
                            mobile: _buildOrdersList(),
                            tablet: _buildOrdersList(),
                            desktop: _buildOrdersTable(),
                          ),
                        ),
                      ],
                    ),
    );
  }

  Widget _buildStatusFilter() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          const Text('Filter by status: '),
          const SizedBox(width: 8),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _statusFilters
                    .map(
                      (status) => Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: FilterChip(
                          label: Text(status),
                          selected: _selectedStatus == status,
                          onSelected: (_) {
                            setState(() {
                              _selectedStatus = status;
                            });
                          },
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrdersList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16.0),
      itemCount: _filteredOrders.length,
      itemBuilder: (context, index) {
        final order = _filteredOrders[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 16.0),
          child: ListTile(
            title: Text('Order #${order.id}'),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                    'Date: ${DateFormat('MMM d, yyyy').format(order.createdAt)}'),
                Text('Customer: ${order.customerName}'),
                const SizedBox(height: 4),
                _buildStatusBadge(order.status),
              ],
            ),
            trailing: Text(
              '\$${order.totalAmount.toStringAsFixed(2)}',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            onTap: () {
              Navigator.pushNamed(
                context,
                '/admin/orders/${order.id}',
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildOrdersTable() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Orders',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${_filteredOrders.length} orders found',
                    style: const TextStyle(
                      color: Colors.grey,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              PaginatedDataTable(
                header: null,
                rowsPerPage: 10,
                columns: const [
                  DataColumn(label: Text('Order ID')),
                  DataColumn(label: Text('Customer')),
                  DataColumn(label: Text('Date')),
                  DataColumn(label: Text('Status')),
                  DataColumn(label: Text('Items')),
                  DataColumn(label: Text('Total')),
                  DataColumn(label: Text('Actions')),
                ],
                source: _OrderDataSource(_filteredOrders, context),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color backgroundColor;
    Color textColor;

    switch (status) {
      case 'Pending':
        backgroundColor = Colors.orange[100]!;
        textColor = Colors.orange[800]!;
        break;
      case 'Processing':
        backgroundColor = Colors.blue[100]!;
        textColor = Colors.blue[800]!;
        break;
      case 'Shipped':
        backgroundColor = Colors.purple[100]!;
        textColor = Colors.purple[800]!;
        break;
      case 'Delivered':
        backgroundColor = Colors.green[100]!;
        textColor = Colors.green[800]!;
        break;
      case 'Cancelled':
        backgroundColor = Colors.red[100]!;
        textColor = Colors.red[800]!;
        break;
      default:
        backgroundColor = Colors.grey[100]!;
        textColor = Colors.grey[800]!;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _OrderDataSource extends DataTableSource {
  final List<Order> _orders;
  final BuildContext context;

  _OrderDataSource(this._orders, this.context);

  @override
  DataRow getRow(int index) {
    final order = _orders[index];
    final _OrdersScreenState orderScreenState =
        context.findAncestorStateOfType<_OrdersScreenState>()!;

    return DataRow(
      cells: [
        DataCell(
          Text(
            '#${order.id}',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          onTap: () {
            Navigator.pushNamed(context, '/admin/orders/${order.id}');
          },
        ),
        DataCell(Text(order.customerName)),
        DataCell(
          Text(DateFormat('MMM d, yyyy').format(order.createdAt)),
        ),
        DataCell(orderScreenState._buildStatusBadge(order.status)),
        DataCell(Text('${order.items.length}')),
        DataCell(
          Text(
            '\$${order.totalAmount.toStringAsFixed(2)}',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
        DataCell(
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.visibility, size: 20),
                onPressed: () {
                  Navigator.pushNamed(
                    context,
                    '/admin/orders/${order.id}',
                  );
                },
              ),
              IconButton(
                icon: const Icon(Icons.receipt, size: 20),
                onPressed: () {
                  // Generate receipt or invoice
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  bool get isRowCountApproximate => false;

  @override
  int get rowCount => _orders.length;

  @override
  int get selectedRowCount => 0;
}
