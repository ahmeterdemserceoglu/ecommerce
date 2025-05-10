import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../widgets/app_drawer.dart';
import '../providers/database_provider.dart';
import '../services/database_service.dart';
import 'package:data_table_2/data_table_2.dart';
import 'dart:convert';
import 'package:file_saver/file_saver.dart';
import 'package:csv/csv.dart';
import 'package:flutter/foundation.dart';

class TablesBrowserScreen extends StatefulWidget {
  const TablesBrowserScreen({Key? key}) : super(key: key);

  @override
  State<TablesBrowserScreen> createState() => _TablesBrowserScreenState();
}

class _TablesBrowserScreenState extends State<TablesBrowserScreen> {
  final DatabaseService _databaseService = DatabaseService();
  List<String> _tables = [];
  String? _selectedTable;
  List<Map<String, dynamic>> _tableSchema = [];
  List<Map<String, dynamic>> _tableData = [];
  bool _isLoadingTables = false;
  bool _isLoadingSchema = false;
  bool _isLoadingData = false;
  bool _isExporting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadTables();
  }

  Future<void> _loadTables() async {
    setState(() {
      _isLoadingTables = true;
      _error = null;
    });

    try {
      final tables = await _databaseService.getDatabaseTables();
      setState(() {
        _tables = tables;
        _isLoadingTables = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load tables: $e';
        _isLoadingTables = false;
      });
    }
  }

  Future<void> _loadTableSchema(String tableName) async {
    setState(() {
      _isLoadingSchema = true;
      _error = null;
    });

    try {
      final schema = await _databaseService.getTableSchema(tableName);
      setState(() {
        _tableSchema = schema;
        _isLoadingSchema = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load schema: $e';
        _isLoadingSchema = false;
      });
    }
  }

  Future<void> _loadTableData(String tableName) async {
    setState(() {
      _isLoadingData = true;
      _error = null;
    });

    try {
      final result = await _databaseService.executeQuery(
        'SELECT * FROM $tableName LIMIT 100',
      );

      if (result.containsKey('error') && result['error'] != null) {
        throw Exception(result['error']);
      }

      List<dynamic> data = [];
      if (result.containsKey('data') && result['data'] != null) {
        data = result['data'];
      }

      setState(() {
        _tableData = List<Map<String, dynamic>>.from(data);
        _isLoadingData = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load data: $e';
        _isLoadingData = false;
      });
    }
  }

  void _selectTable(String tableName) {
    setState(() {
      _selectedTable = tableName;
      _tableSchema = [];
      _tableData = [];
    });
    _loadTableSchema(tableName);
    _loadTableData(tableName);
  }

  Future<void> _exportTableData() async {
    if (_selectedTable == null || _tableData.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No data available to export'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isExporting = true;
    });

    try {
      // Try to get more data for export (up to 1000 rows)
      final result = await _databaseService.executeQuery(
        'SELECT * FROM $_selectedTable LIMIT 1000',
      );

      List<dynamic> data = [];
      if (!result.containsKey('error') && result['data'] != null) {
        data = result['data'];
      } else {
        // Fallback to current data
        data = _tableData;
      }

      if (data.isEmpty) {
        throw Exception('No data available for export');
      }

      // Convert to CSV
      final headers = data.first.keys.toList();
      final rows =
          data.map((row) => headers.map((h) => row[h]).toList()).toList();

      final csvData = [headers, ...rows];
      final csv = const ListToCsvConverter().convert(csvData);

      // Save the file
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final fileName = '${_selectedTable}_export_$timestamp';

      if (kIsWeb) {
        // Web platform
        await FileSaver.instance.saveFile(
          name: fileName,
          ext: 'csv',
          bytes: Uint8List.fromList(csv.codeUnits),
        );
      } else {
        // Mobile/Desktop platforms
        await FileSaver.instance.saveAs(
          name: fileName,
          ext: 'csv',
          bytes: Uint8List.fromList(utf8.encode(csv)),
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Table data exported successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to export data: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isExporting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Database Tables'),
        actions: [
          if (_selectedTable != null &&
              !_isLoadingData &&
              _tableData.isNotEmpty)
            IconButton(
              icon: _isExporting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.file_download),
              onPressed: _isExporting ? null : _exportTableData,
              tooltip: 'Export as CSV',
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTables,
            tooltip: 'Refresh Tables',
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _error != null
          ? _buildErrorWidget()
          : Row(
              children: [
                // Tables sidebar
                Container(
                  width: 250,
                  decoration: BoxDecoration(
                    border: Border(
                      right: BorderSide(
                        color: Theme.of(context).dividerColor,
                      ),
                    ),
                  ),
                  child: _buildTablesList(),
                ),
                // Table content
                Expanded(
                  child: _selectedTable == null
                      ? const Center(
                          child: Text('Select a table to view its data'),
                        )
                      : _buildTableContent(),
                ),
              ],
            ),
    );
  }

  Widget _buildErrorWidget() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              color: Colors.red,
              size: 48,
            ),
            const SizedBox(height: 16),
            Text(
              _error!,
              style: const TextStyle(
                fontSize: 16,
                color: Colors.red,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadTables,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTablesList() {
    if (_isLoadingTables) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_tables.isEmpty) {
      return const Center(
        child: Text('No tables found'),
      );
    }

    return ListView.builder(
      itemCount: _tables.length,
      itemBuilder: (context, index) {
        final tableName = _tables[index];
        return ListTile(
          title: Text(tableName),
          selected: _selectedTable == tableName,
          onTap: () => _selectTable(tableName),
          leading: const Icon(Icons.table_chart),
        );
      },
    );
  }

  Widget _buildTableContent() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _selectedTable!,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 16),

          // Table Schema
          Text(
            'Schema',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          _isLoadingSchema
              ? const Center(child: CircularProgressIndicator())
              : _tableSchema.isEmpty
                  ? const Text('No schema information available')
                  : _buildSchemaTable(),

          const SizedBox(height: 24),

          // Table Data
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Data (Limited to 100 rows)',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Row(
                children: [
                  if (!_isLoadingData && _tableData.isNotEmpty)
                    ElevatedButton.icon(
                      onPressed: _isExporting ? null : _exportTableData,
                      icon: _isExporting
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.file_download),
                      label: const Text('Export CSV'),
                    ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _isLoadingData
                        ? null
                        : () => _loadTableData(_selectedTable!),
                    child: const Text('Refresh Data'),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          _isLoadingData
              ? const Center(child: CircularProgressIndicator())
              : _tableData.isEmpty
                  ? const Text('No data available')
                  : Expanded(child: _buildDataTable()),
        ],
      ),
    );
  }

  Widget _buildSchemaTable() {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: DataTable2(
        columns: const [
          DataColumn2(label: Text('Column'), size: ColumnSize.L),
          DataColumn2(label: Text('Type'), size: ColumnSize.L),
          DataColumn2(label: Text('Nullable'), size: ColumnSize.S),
          DataColumn2(label: Text('Default'), size: ColumnSize.L),
        ],
        rows: _tableSchema
            .map((column) => DataRow(cells: [
                  DataCell(Text(column['column_name'] ?? '')),
                  DataCell(Text(column['data_type'] ?? '')),
                  DataCell(Text(column['is_nullable'] == 'YES' ? 'Yes' : 'No')),
                  DataCell(Text(column['column_default'] ?? '')),
                ]))
            .toList(),
      ),
    );
  }

  Widget _buildDataTable() {
    if (_tableData.isEmpty) {
      return const Center(child: Text('No data available'));
    }

    // Extract column names from the first row
    final columns = _tableData.first.keys.toList();

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: SingleChildScrollView(
        scrollDirection: Axis.vertical,
        child: DataTable(
          columns: columns
              .map((column) => DataColumn(
                    label: Text(
                      column,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ))
              .toList(),
          rows: _tableData.map((row) {
            return DataRow(
              cells: columns
                  .map(
                    (column) => DataCell(
                      Text(
                        '${row[column] ?? 'NULL'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  )
                  .toList(),
            );
          }).toList(),
        ),
      ),
    );
  }
}
