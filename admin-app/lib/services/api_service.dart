import '../models/product.dart';
import '../models/order.dart';
import '../models/user.dart';
import '../models/store.dart';
import '../models/category.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  final String _baseUrl = 'https://www.hdticaret.com/api';
  final Map<String, String> _headers = {
    'Content-Type': 'application/json',
  };

  // Set the authorization token
  void setToken(String token) {
    _headers['Authorization'] = 'Bearer $token';
  }

  // Products
  Future<List<Product>> fetchProducts({
    int page = 1, // Default to page 1
    int? limit,
    String? searchTerm,
    String? status,
    String? categoryId,
  }) async {
    try {
      final Map<String, String> queryParameters = {
        'page': page.toString(),
      };
      if (limit != null) {
        queryParameters['limit'] = limit.toString();
      }
      if (searchTerm != null && searchTerm.isNotEmpty) {
        queryParameters['search'] = searchTerm;
      }
      if (status != null && status.isNotEmpty) {
        queryParameters['status'] = status;
      }
      if (categoryId != null && categoryId.isNotEmpty) {
        queryParameters['categoryId'] = categoryId;
      }

      // Uri.http or Uri.https automatically handles query parameter encoding
      final uri = Uri.parse('$_baseUrl/admin/products')
          .replace(queryParameters: queryParameters);

      final response = await http.get(
        uri,
        headers: _headers,
      );

      if (response.statusCode == 200) {
        // Assuming the API returns a list of products directly
        // or a structure like { "products": [], "totalPages": 5, ... }
        // For now, let's assume it's a direct list or a list under a 'data' key.
        // The ProductsProvider will need to handle the actual structure for pagination.
        final dynamic decodedBody = json.decode(response.body);

        List<dynamic> productListData;
        if (decodedBody is Map && decodedBody.containsKey('products')) {
          // Handle if API returns { "products": [...], ... }
          productListData = decodedBody['products'];
        } else if (decodedBody is Map && decodedBody.containsKey('data')) {
          // Handle if API returns { "data": [...], ... }
          productListData = decodedBody['data'];
        } else if (decodedBody is List) {
          productListData = decodedBody;
        } else {
          throw Exception('Unexpected response format for products');
        }
        return productListData.map((json) => Product.fromJson(json)).toList();
      } else {
        _handleErrorResponse(response, 'Ürünler yüklenemedi');
        return []; // Should not reach here if _handleErrorResponse throws
      }
    } catch (e) {
      // If _handleErrorResponse rethrows or another exception occurs
      if (e is Exception) {
        throw e; // Rethrow known exceptions
      }
      throw Exception('Ürünler alınırken bir hata oluştu: $e');
    }
  }

  Future<Product> fetchProductById(String id) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/admin/products/$id'), // Use admin endpoint
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final dynamic responseData = json.decode(response.body);
        // Handle if API returns { "data": ... }
        if (responseData is Map && responseData.containsKey('data')) {
          return Product.fromJson(responseData['data']);
        }
        return Product.fromJson(responseData);
      } else {
        _handleErrorResponse(response, 'Ürün yüklenemedi');
      }
    } catch (e) {
      if (e is Exception) {
        throw e;
      }
      throw Exception('Ürün alınırken bir hata oluştu: $e');
    }
    throw Exception('Ürün bulunamadı veya bir hata oluştu.');
  }

  Future<Product> createProduct(Product product) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/admin/products'), // Admin endpoint'i olmalı
        headers: _headers,
        body: json.encode(product.toJson()),
      );
      if (response.statusCode == 201) {
        final dynamic responseData = json.decode(response.body);
        // Eğer backend { "data": ... } şeklinde dönüyorsa:
        // final dynamic responseData = json.decode(response.body)['data'];
        return Product.fromJson(responseData);
      } else {
        _handleErrorResponse(response, 'Ürün oluşturulamadı');
      }
    } catch (e) {
      throw Exception('Ürün oluşturulurken bir hata oluştu: $e');
    }
    throw Exception('Ürün oluşturulamadı veya bir hata oluştu.');
  }

  Future<Product> updateProduct(Product product) async {
    try {
      final response = await http.put(
        Uri.parse(
            '$_baseUrl/admin/products/${product.id}'), // Admin endpoint'i olmalı
        headers: _headers,
        body: json.encode(product.toJson()),
      );
      if (response.statusCode == 200) {
        final dynamic responseData = json.decode(response.body);
        // Eğer backend { "data": ... } şeklinde dönüyorsa:
        // final dynamic responseData = json.decode(response.body)['data'];
        return Product.fromJson(responseData);
      } else {
        _handleErrorResponse(response, 'Ürün güncellenemedi');
      }
    } catch (e) {
      throw Exception('Ürün güncellenirken bir hata oluştu: $e');
    }
    throw Exception('Ürün güncellenemedi veya bir hata oluştu.');
  }

  Future<void> deleteProduct(String id) async {
    try {
      final response = await http.delete(
        Uri.parse('$_baseUrl/admin/products/$id'), // Admin endpoint'i olmalı
        headers: _headers,
      );
      if (response.statusCode != 204 && response.statusCode != 200) {
        // 200 OK de kabul edilebilir
        _handleErrorResponse(response, 'Ürün silinemedi');
      }
    } catch (e) {
      throw Exception('Ürün silinirken bir hata oluştu: $e');
    }
  }

  // Generic Error Handler
  void _handleErrorResponse(http.Response response, String defaultMessage) {
    String errorMessage = defaultMessage;
    try {
      final errorData = json.decode(response.body);
      if (errorData != null &&
          errorData['error'] != null &&
          errorData['error']['message'] != null) {
        errorMessage = errorData['error']['message'];
      } else if (errorData != null && errorData['message'] != null) {
        errorMessage = errorData['message'];
      } else {
        errorMessage =
            '$defaultMessage: ${response.statusCode} - ${response.reasonPhrase}';
      }
    } catch (e) {
      // JSON parse hatası olursa veya body boşsa
      errorMessage =
          '$defaultMessage. Sunucuya bağlanırken bir sorun oluştu: ${response.statusCode}';
    }
    throw Exception(errorMessage);
  }

  // Orders
  Future<List<Order>> fetchOrders({int? limit}) async {
    try {
      final queryParams = limit != null ? '?limit=$limit' : '';
      final response = await http.get(
        Uri.parse('$_baseUrl/orders$queryParams'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body)['data'];
        return data.map((json) => Order.fromJson(json)).toList();
      } else {
        throw Exception('Siparişler yüklenemedi: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Siparişler alınamadı: $e');
    }
  }

  Future<Order> fetchOrderById(String id) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/orders/$id'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final dynamic data = json.decode(response.body)['data'];
        return Order.fromJson(data);
      } else {
        throw Exception('Sipariş yüklenemedi: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Sipariş alınamadı: $e');
    }
  }

  Future<void> updateOrderStatus(String orderId, String status) async {
    try {
      final response = await http.patch(
        Uri.parse('$_baseUrl/orders/$orderId'),
        headers: _headers,
        body: json.encode({'status': status}),
      );
      if (response.statusCode != 200) {
        throw Exception(
            'Sipariş durumu güncellenemedi: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Sipariş durumu güncellenemedi: $e');
    }
  }

  // Users
  Future<List<User>> fetchUsers({int? limit}) async {
    try {
      final queryParams = limit != null ? '?limit=$limit' : '';
      final response = await http.get(
        Uri.parse('$_baseUrl/users$queryParams'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body)['data'];
        return data.map((json) => User.fromJson(json)).toList();
      } else {
        throw Exception('Kullanıcılar yüklenemedi: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Kullanıcılar alınamadı: $e');
    }
  }

  // Stores
  Future<List<Store>> fetchStores() async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/stores'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body)['data'];
        return data.map((json) => Store.fromJson(json)).toList();
      } else {
        throw Exception('Mağazalar yüklenemedi: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Mağazalar alınamadı: $e');
    }
  }

  // Categories
  Future<List<Category>> fetchCategories() async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/categories'), // Genellikle halka açık endpoint
        headers: _headers,
      );
      if (response.statusCode == 200) {
        // Backend'inize göre data['data'] veya direkt data olabilir
        final List<dynamic> responseData = json.decode(response.body);
        // Eğer backend { "data": [...] } şeklinde dönüyorsa:
        // final List<dynamic> responseData = json.decode(response.body)['data'];
        return responseData.map((json) => Category.fromJson(json)).toList();
      } else {
        throw Exception('Kategoriler yüklenemedi: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Kategoriler alınamadı: $e');
    }
  }

  Future<Category> createCategory(Category category) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/admin/categories'), // Admin endpoint'i
        headers: _headers,
        body: json.encode(category.toJson()),
      );
      if (response.statusCode == 201) {
        // Backend'inize göre data['data'] veya direkt data olabilir
        final dynamic responseData = json.decode(response.body);
        // Eğer backend { "data": ... } şeklinde dönüyorsa:
        // final dynamic responseData = json.decode(response.body)['data'];
        return Category.fromJson(responseData);
      } else {
        throw Exception(
            'Kategori oluşturulamadı: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Kategori oluşturulamadı: $e');
    }
  }

  Future<Category> updateCategory(Category category) async {
    try {
      final response = await http.put(
        Uri.parse(
            '$_baseUrl/admin/categories/${category.id}'), // Admin endpoint'i
        headers: _headers,
        body: json.encode(category.toJson()),
      );
      if (response.statusCode == 200) {
        final dynamic responseData = json.decode(response.body);
        // Eğer backend { "data": ... } şeklinde dönüyorsa:
        // final dynamic responseData = json.decode(response.body)['data'];
        return Category.fromJson(responseData);
      } else {
        throw Exception(
            'Kategori güncellenemedi: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Kategori güncellenemedi: $e');
    }
  }

  Future<void> deleteCategory(String id) async {
    try {
      final response = await http.delete(
        Uri.parse('$_baseUrl/admin/categories/$id'), // Admin endpoint'i
        headers: _headers,
      );
      if (response.statusCode != 204 && response.statusCode != 200) {
        // 200 OK de kabul edilebilir bazen
        throw Exception(
            'Kategori silinemedi: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Kategori silinemedi: $e');
    }
  }
}
