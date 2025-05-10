import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/products_provider.dart';
import '../providers/category_provider.dart'; // Kategori filtresi için
import '../models/product.dart';
import '../models/category.dart'; // Kategori filtresi için
import '../utils/theme.dart';
import '../utils/responsive.dart'; // Responsive widget için
import '../widgets/app_drawer.dart'; // AppDrawer ekleyebiliriz

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({Key? key}) : super(key: key);

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Provider'ları dinlemeden çağır
      Provider.of<ProductsProvider>(context, listen: false)
          .fetchProducts(page: 1, forceRefresh: true);
      Provider.of<CategoryProvider>(context, listen: false)
          .fetchCategories(); // Filtre için kategorileri yükle
    });

    _scrollController.addListener(() {
      if (_scrollController.position.pixels ==
          _scrollController.position.maxScrollExtent) {
        Provider.of<ProductsProvider>(context, listen: false).loadNextPage();
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _showProductFormDialog(BuildContext context, {Product? productToEdit}) {
    final _formKey = GlobalKey<FormState>();
    final _nameController =
        TextEditingController(text: productToEdit?.name ?? '');
    final _descriptionController =
        TextEditingController(text: productToEdit?.description ?? '');
    final _priceController =
        TextEditingController(text: productToEdit?.price.toString() ?? '');
    final _stockController =
        TextEditingController(text: productToEdit?.stock.toString() ?? '');
    final _imageUrlController =
        TextEditingController(text: productToEdit?.imageUrl ?? '');
    // Kategori ID'si için bir değişken (eğer düzenleme yapılıyorsa atanır)
    String? _selectedCategoryId = productToEdit?.categoryId;

    showDialog(
      context: context,
      builder: (ctx) {
        // Kategori listesini al (Dialog içinde state değişikliği olabilir diye Consumer veya Selector kullanılabilir)
        final categories =
            Provider.of<CategoryProvider>(context, listen: false).categories;

        return AlertDialog(
          title:
              Text(productToEdit == null ? 'Yeni Ürün Ekle' : 'Ürünü Düzenle'),
          content: Form(
            key: _formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Ürün Adı'),
                    validator: (value) =>
                        value!.isEmpty ? 'Ürün adı boş olamaz.' : null,
                  ),
                  TextFormField(
                    controller: _descriptionController,
                    decoration: const InputDecoration(labelText: 'Açıklama'),
                    maxLines: 3,
                  ),
                  TextFormField(
                    controller: _priceController,
                    decoration: const InputDecoration(labelText: 'Fiyat'),
                    keyboardType:
                        TextInputType.numberWithOptions(decimal: true),
                    validator: (value) => value!.isEmpty ||
                            double.tryParse(value) == null ||
                            double.parse(value) <= 0
                        ? 'Geçerli bir fiyat girin.'
                        : null,
                  ),
                  TextFormField(
                    controller: _stockController,
                    decoration: const InputDecoration(labelText: 'Stok Adedi'),
                    keyboardType: TextInputType.number,
                    validator: (value) => value!.isEmpty ||
                            int.tryParse(value) == null ||
                            int.parse(value) < 0
                        ? 'Geçerli bir stok adedi girin.'
                        : null,
                  ),
                  TextFormField(
                    controller: _imageUrlController,
                    decoration: const InputDecoration(
                        labelText: 'Görsel URL (Opsiyonel)'),
                  ),
                  if (categories.isNotEmpty)
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(
                          labelText: 'Kategori (Opsiyonel)'),
                      value: _selectedCategoryId,
                      items: categories.map((Category category) {
                        return DropdownMenuItem<String>(
                          value: category.id,
                          child: Text(category.name),
                        );
                      }).toList(),
                      onChanged: (String? newValue) {
                        _selectedCategoryId = newValue;
                      },
                    ),
                ],
              ),
            ),
          ),
          actions: <Widget>[
            TextButton(
              child: const Text('İptal'),
              onPressed: () => Navigator.of(ctx).pop(),
            ),
            ElevatedButton(
              child: Text(productToEdit == null ? 'Ekle' : 'Güncelle'),
              onPressed: () async {
                if (_formKey.currentState!.validate()) {
                  final productsProvider =
                      Provider.of<ProductsProvider>(context, listen: false);
                  final product = Product(
                    id: productToEdit?.id ??
                        DateTime.now().toString(), // Backend ID atamalı
                    name: _nameController.text,
                    description: _descriptionController.text,
                    price: double.parse(_priceController.text),
                    stock: int.parse(_stockController.text),
                    imageUrl: _imageUrlController.text,
                    categoryId: _selectedCategoryId,
                    // status, storeId gibi diğer alanlar backend tarafından veya farklı bir şekilde yönetilebilir
                  );

                  bool success;
                  if (productToEdit == null) {
                    success = await productsProvider.createProduct(product);
                  } else {
                    success = await productsProvider.updateProduct(product);
                  }
                  Navigator.of(ctx).pop();
                  if (success) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text(productToEdit == null
                              ? 'Ürün eklendi!'
                              : 'Ürün güncellendi!')),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text(productsProvider.error ??
                              'İşlem başarısız oldu.'),
                          backgroundColor: Colors.red),
                    );
                  }
                }
              },
            ),
          ],
        );
      },
    );
  }

  void _deleteProduct(BuildContext context, Product product) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ürünü Sil'),
        content: Text(
            '\'${product.name}\' ürününü silmek istediğinizden emin misiniz?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('İptal')),
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Sil', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm == true) {
      final productsProvider =
          Provider.of<ProductsProvider>(context, listen: false);
      final success = await productsProvider.deleteProduct(product.id);
      if (success) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Ürün silindi!')));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(productsProvider.error ?? 'Ürün silinemedi.'),
              backgroundColor: Colors.red),
        );
      }
    }
  }

  Widget _buildFilterChips(BuildContext context) {
    final productsProvider =
        Provider.of<ProductsProvider>(context, listen: false);
    // Kategori provider'ını da dinleyebiliriz, ama şimdilik sadece ProductsProvider'dan status alalım.
    // String? currentStatusFilter = productsProvider.statusFilter; // Provider'da statusFilter state'i olmalı

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            ActionChip(
                label: Text('Tümü'),
                onPressed: () => productsProvider.clearFilters()),
            // TODO: productsProvider.statusFilter gibi bir değişkene göre seçili olanı vurgula
            ActionChip(
                label: Text('Onay Bekleyen'),
                onPressed: () => productsProvider.setStatusFilter('pending')),
            ActionChip(
                label: Text('Onaylı'),
                onPressed: () => productsProvider.setStatusFilter('approved')),
            ActionChip(
                label: Text('Reddedilmiş'),
                onPressed: () => productsProvider.setStatusFilter('rejected')),
            // Kategori filtresi için DropdownButton veya başka bir UI elemanı eklenebilir.
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // ProductsProvider ve CategoryProvider'ı dinle
    final productsProvider = Provider.of<ProductsProvider>(context);
    final categories = Provider.of<CategoryProvider>(context).categories;

    return Scaffold(
      drawer: const AppDrawer(), // Drawer eklendi
      appBar: AppBar(
        title: const Text('Ürünler'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Yeni Ürün Ekle',
            onPressed: () => _showProductFormDialog(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Yenile',
            onPressed: () =>
                productsProvider.fetchProducts(page: 1, forceRefresh: true),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                  hintText: 'Ürünlerde ara...',
                  prefixIcon: Icon(Icons.search),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8)),
                  suffixIcon: IconButton(
                    icon: Icon(Icons.clear),
                    onPressed: () {
                      _searchController.clear();
                      productsProvider.setSearchQuery(null);
                    },
                  )),
              onSubmitted: (value) => productsProvider.setSearchQuery(value),
            ),
          ),
          _buildFilterChips(context),
          Expanded(
            child: productsProvider.isLoading &&
                    productsProvider.products.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : productsProvider.error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.error_outline,
                                  color: Colors.red, size: 48),
                              const SizedBox(height: 10),
                              Text(productsProvider.error!,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                      color: Colors.red, fontSize: 16)),
                              const SizedBox(height: 20),
                              ElevatedButton.icon(
                                icon: const Icon(Icons.refresh),
                                label: const Text('Yeniden Dene'),
                                onPressed: () => productsProvider.fetchProducts(
                                    page: 1, forceRefresh: true),
                                style: ElevatedButton.styleFrom(
                                    backgroundColor: AdminTheme.primary,
                                    foregroundColor: Colors.white),
                              ),
                            ],
                          ),
                        ),
                      )
                    : productsProvider.products.isEmpty
                        ? const Center(
                            child: Text(
                                'Filtreyle eşleşen ürün bulunamadı veya hiç ürün yok.'))
                        : ListView.builder(
                            controller: _scrollController,
                            itemCount: productsProvider.products.length +
                                (productsProvider.hasNextPage ? 1 : 0),
                            itemBuilder: (ctx, index) {
                              if (index == productsProvider.products.length &&
                                  productsProvider.hasNextPage) {
                                return const Center(
                                    child: Padding(
                                        padding: EdgeInsets.all(8.0),
                                        child: CircularProgressIndicator()));
                              }
                              if (index >= productsProvider.products.length)
                                return const SizedBox
                                    .shrink(); // Fazladan build'i engelle

                              final product = productsProvider.products[index];
                              return Card(
                                margin: const EdgeInsets.symmetric(
                                    horizontal: 15, vertical: 5),
                                child: ListTile(
                                  leading: product.imageUrl != null &&
                                          product.imageUrl!.isNotEmpty
                                      ? CircleAvatar(
                                          backgroundImage:
                                              NetworkImage(product.imageUrl!),
                                          onBackgroundImageError: (_, __) {})
                                      : const CircleAvatar(
                                          child:
                                              Icon(Icons.inventory_2_outlined)),
                                  title: Text(product.name,
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold)),
                                  subtitle: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                          'Fiyat: ${product.price.toStringAsFixed(2)}₺'),
                                      Text('Stok: ${product.stock}'),
                                      if (product.categoryName != null)
                                        Text(
                                            'Kategori: ${product.categoryName}'), // Product modelinde categoryName olmalı
                                      if (product.status != null)
                                        Text(
                                            'Durum: ${product.status}'), // Product modelinde status alanı olmalı
                                    ],
                                  ),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      // TODO: Ürün onay/red butonları eklenebilir (Provider'daki approveProduct vb. metodlarla)
                                      IconButton(
                                        icon: const Icon(Icons.edit,
                                            color: Colors.orange),
                                        tooltip: 'Düzenle',
                                        onPressed: () => _showProductFormDialog(
                                            context,
                                            productToEdit: product),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete,
                                            color: Colors.red),
                                        tooltip: 'Sil',
                                        onPressed: () =>
                                            _deleteProduct(context, product),
                                      ),
                                    ],
                                  ),
                                  onTap: () {
                                    // Ürün detay sayfasına gidilebilir veya düzenleme dialog'u açılabilir.
                                    _showProductFormDialog(context,
                                        productToEdit: product);
                                  },
                                ),
                              );
                            },
                          ),
          ),
          // Sayfalama Kontrolleri (Opsiyonel, sonsuz scroll yerine butonlarla)
          if (productsProvider.totalPages > 1 && !productsProvider.isLoading)
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                      icon: Icon(Icons.first_page),
                      onPressed: productsProvider.hasPreviousPage
                          ? () => productsProvider.fetchProducts(
                              page: 1, forceRefresh: true)
                          : null),
                  IconButton(
                      icon: Icon(Icons.navigate_before),
                      onPressed: productsProvider.hasPreviousPage
                          ? () => productsProvider.loadPreviousPage()
                          : null),
                  Text(
                      'Sayfa ${productsProvider.currentPage} / ${productsProvider.totalPages}'),
                  IconButton(
                      icon: Icon(Icons.navigate_next),
                      onPressed: productsProvider.hasNextPage
                          ? () => productsProvider.loadNextPage()
                          : null),
                  IconButton(
                      icon: Icon(Icons.last_page),
                      onPressed: productsProvider.hasNextPage
                          ? () => productsProvider.fetchProducts(
                              page: productsProvider.totalPages,
                              forceRefresh: true)
                          : null),
                ],
              ),
            )
        ],
      ),
    );
  }
}
