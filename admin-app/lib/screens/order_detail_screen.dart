import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../models/order.dart';
import '../utils/responsive.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;

  const OrderDetailScreen({Key? key, required this.orderId}) : super(key: key);

  @override
  _OrderDetailScreenState createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final ApiService _apiService = ApiService();
  late Future<Order> _orderFuture;

  @override
  void initState() {
    super.initState();
    _orderFuture = _apiService.fetchOrderById(widget.orderId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Order #${widget.orderId}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.print),
            onPressed: () {
              // Print invoice functionality
            },
          ),
        ],
      ),
      body: FutureBuilder<Order>(
        future: _orderFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 60),
                  const SizedBox(height: 16),
                  Text('Error: ${snapshot.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _orderFuture =
                            _apiService.fetchOrderById(widget.orderId);
                      });
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          } else if (!snapshot.hasData) {
            return const Center(child: Text('Order not found'));
          }

          final order = snapshot.data!;

          return Responsive(
            mobile: _buildMobileLayout(context, order),
            tablet: _buildTabletLayout(context, order),
            desktop: _buildDesktopLayout(context, order),
          );
        },
      ),
    );
  }

  Widget _buildMobileLayout(BuildContext context, Order order) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildOrderSummary(context, order),
          const SizedBox(height: 24),
          _buildCustomerInfo(context, order),
          const SizedBox(height: 24),
          _buildOrderItems(context, order),
          const SizedBox(height: 24),
          _buildOrderTotal(context, order),
        ],
      ),
    );
  }

  Widget _buildTabletLayout(BuildContext context, Order order) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 1,
                child: _buildOrderSummary(context, order),
              ),
              const SizedBox(width: 24),
              Expanded(
                flex: 1,
                child: _buildCustomerInfo(context, order),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildOrderItems(context, order),
          const SizedBox(height: 24),
          _buildOrderTotal(context, order),
        ],
      ),
    );
  }

  Widget _buildDesktopLayout(BuildContext context, Order order) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: _buildOrderSummary(context, order),
              ),
              const SizedBox(width: 32),
              Expanded(
                flex: 1,
                child: _buildCustomerInfo(context, order),
              ),
            ],
          ),
          const SizedBox(height: 32),
          _buildOrderItems(context, order),
          const SizedBox(height: 24),
          Align(
            alignment: Alignment.centerRight,
            child: SizedBox(
              width: 400,
              child: _buildOrderTotal(context, order),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderSummary(BuildContext context, Order order) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Order Summary',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            _buildInfoRow('Order ID', order.id),
            _buildInfoRow(
                'Date', DateFormat('MMM d, yyyy').format(order.createdAt)),
            _buildInfoRow('Payment Method', order.paymentMethod ?? 'N/A'),
            _buildInfoRow('Status', order.status),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomerInfo(BuildContext context, Order order) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Customer Information',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            _buildInfoRow('Name', order.customerName),
            _buildInfoRow('Email', order.customerEmail ?? 'N/A'),
            _buildInfoRow('Phone', order.customerPhone ?? 'N/A'),
            const SizedBox(height: 16),
            Text(
              'Shipping Address',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            if (order.shippingAddress != null)
              Text(order.shippingAddress!)
            else
              const Text('No shipping address provided'),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderItems(BuildContext context, Order order) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Order Items',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: order.items.length,
              separatorBuilder: (context, index) => const Divider(),
              itemBuilder: (context, index) {
                final item = order.items[index];
                return ListTile(
                  title: Text(item.productName),
                  subtitle: Text('SKU: ${item.sku ?? 'N/A'}'),
                  trailing: SizedBox(
                    width: 120,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text('${item.quantity} ×'),
                        const SizedBox(width: 8),
                        Text(
                          '\$${item.price.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderTotal(BuildContext context, Order order) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Subtotal'),
                Text('\$${order.subtotal.toStringAsFixed(2)}'),
              ],
            ),
            const SizedBox(height: 8),
            if (order.tax != null) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Tax'),
                  Text('\$${order.tax!.toStringAsFixed(2)}'),
                ],
              ),
              const SizedBox(height: 8),
            ],
            if (order.shipping != null) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Shipping'),
                  Text('\$${order.shipping!.toStringAsFixed(2)}'),
                ],
              ),
              const SizedBox(height: 8),
            ],
            if (order.discount != null) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Discount'),
                  Text('-\$${order.discount!.toStringAsFixed(2)}'),
                ],
              ),
              const SizedBox(height: 8),
            ],
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Total',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  '\$${order.totalAmount.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }
}
