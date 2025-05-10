import 'package:flutter/material.dart';
import '../utils/responsive.dart';
import '../services/api_service.dart';
import '../models/product.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({Key? key}) : super(key: key);

  @override
  _ProductsScreenState createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final ApiService _apiService = ApiService();
  List<Product> _products = [];
  bool _isLoading = true;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _fetchProducts();
  }

  Future<void> _fetchProducts() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final products = await _apiService.fetchProducts();
      setState(() {
        _products = products;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Ürünler yüklenemedi: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ürünler'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Ürün Ekle',
            onPressed: () {
              Navigator.pushNamed(context, '/admin/products/add');
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Yenile',
            onPressed: _fetchProducts,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage.isNotEmpty
              ? ErrorDisplay(
                  userMessage: _getUserFriendlyError(_errorMessage),
                  technicalDetails: _errorMessage,
                  onRetry: _fetchProducts,
                )
              : _products.isEmpty
                  ? const Center(child: Text('Hiç ürün bulunamadı.'))
                  : Responsive(
                      mobile: _buildProductsGrid(context, 1),
                      tablet: _buildProductsGrid(context, 2),
                      desktop: _buildProductsGrid(context, 3),
                    ),
    );
  }

  Widget _buildProductsGrid(BuildContext context, int crossAxisCount) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: GridView.builder(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: crossAxisCount,
          childAspectRatio: 1,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
        ),
        itemCount: _products.length,
        itemBuilder: (context, index) {
          final product = _products[index];
          return Card(
            clipBehavior: Clip.antiAlias,
            elevation: 3,
            child: InkWell(
              onTap: () {
                Navigator.pushNamed(
                  context,
                  '/admin/products/edit/${product.id}',
                );
              },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  product.imageUrl != null && product.imageUrl!.isNotEmpty
                      ? Expanded(
                          child: Image.network(
                            product.imageUrl!,
                            fit: BoxFit.cover,
                            width: double.infinity,
                            errorBuilder: (context, _, __) => const Center(
                              child: Icon(
                                Icons.image_not_supported,
                                size: 50,
                                color: Colors.grey,
                              ),
                            ),
                          ),
                        )
                      : Expanded(
                          child: Container(
                            color: Colors.grey[200],
                            child: const Center(
                              child: Icon(Icons.image, color: Colors.grey),
                            ),
                          ),
                        ),
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '₺${product.price.toStringAsFixed(2)}',
                          style: TextStyle(
                            fontSize: 14,
                            color: Theme.of(context).colorScheme.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Stok: ${product.stock}',
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _getUserFriendlyError(String errorMsg) {
    if (errorMsg.contains('Failed host lookup')) {
      return 'API adresi hatalı veya sunucuya ulaşılamıyor.';
    } else if (errorMsg.contains('404')) {
      return 'İstenilen veri bulunamadı (404).';
    } else if (errorMsg.contains('401') || errorMsg.contains('403')) {
      return 'Yetkisiz işlem. Lütfen tekrar giriş yapın.';
    } else if (errorMsg.contains('500')) {
      return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
    }
    return 'Bir hata oluştu.';
  }
}

class ErrorDisplay extends StatelessWidget {
  final String userMessage;
  final String? technicalDetails;
  final VoidCallback? onRetry;

  const ErrorDisplay({
    required this.userMessage,
    this.technicalDetails,
    this.onRetry,
    Key? key,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error, color: Colors.red, size: 48),
          const SizedBox(height: 16),
          Text(userMessage, style: const TextStyle(fontSize: 16)),
          if (technicalDetails != null) ...[
            const SizedBox(height: 8),
            Text(technicalDetails!,
                style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
          if (onRetry != null) ...[
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('Tekrar Dene'),
            ),
          ],
        ],
      ),
    );
  }
}
