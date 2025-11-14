/**
 * ========================================================================
 * CsvImportComponent – CSV Import for Cabinet Products
 * ========================================================================
 *
 * Standalone component for uploading a CSV file, previewing rows, and bulk-creating
 * CabinetProduct records via GraphQL mutations. Handles parsing, validation, and error display.
 * Includes mapping from WooCommerce export format to CabinetProduct model (e.g., SKU to wSKU, meta fields to brand/doorStyle).
 *
 * • File upload with drag/drop support
 * • Preview table of parsed/mapped rows
 * • Bulk create with progress and error handling
 *
 * Tech: Angular 18+, standalone, PapaParse for CSV, RxJS 7+, Amplify v6
 * ========================================================================
 */

import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

// External lib for CSV parsing (add to package.json: "papaparse": "^5.4.1")
import Papa from 'papaparse';
import {CabinetProductGraphqlService} from "../../app-data/stores/cabinet-product-graphql.service";

// Import generated types from Amplify API
import {
  CabinetProduct,
  CreateCabinetProductMutation
} from '../../API.service';

// -----------------------------------------------------------------
// Component Decorator
// -----------------------------------------------------------------
@Component({
  selector: 'app-csv-import',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './csv-import.component.html',
  styleUrls: ['./csv-import.component.scss'],
})
export class CsvImportComponent implements OnInit {
  // -----------------------------------------------------------------
  // Inputs (setters listen for change like ngChanges)
  // -----------------------------------------------------------------
  // No @Input() needed – standalone usage

  // -----------------------------------------------------------------
  // Outputs
  // -----------------------------------------------------------------
  // No @Output() needed – standalone usage

  // -----------------------------------------------------------------
  // Runtime State
  // -----------------------------------------------------------------
  // Form for optional batch settings (e.g., default values)
  importForm: FormGroup;

  // Raw parsed CSV data (array of row objects from WooCommerce export)
  parsedRows: any[] = [];

  // Mapped CabinetProduct inputs (transformed for GraphQL)
  mappedRows: Partial<CabinetProduct>[] = [];

  // Preview data for table (first 10 mapped rows)
  previewRows: Partial<CabinetProduct>[] = [];

  // Loading state for upload/parse
  isParsing = false;

  // Drag over state for visual feedback
  isDragOver = false;

  // Loading state for import
  isImporting = false;

  // Progress (0-100)
  importProgress = 0;

  // Error message
  errorMessage: string | null = null;

  // Success message
  successMessage: string | null = null;

  // Total imported count
  importedCount = 0;

  // -----------------------------------------------------------------
  // DI
  // -----------------------------------------------------------------
  constructor(
    private fb: FormBuilder,
    private cabinetService: CabinetProductGraphqlService
  ) {
    // Initialize form with optional defaults (e.g., publish status)
    this.importForm = this.fb.group({
      defaultPublish: [false],
      defaultDiscount: [0, [Validators.min(0), Validators.max(100)]]
    });
  }

  // -----------------------------------------------------------------
  // ViewChild References
  // -----------------------------------------------------------------
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // -----------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------
  ngOnInit() {
    // Reset state on init
    this.resetState();
  }

  // -----------------------------------------------------------------
  // TrackBy for performance
  // -----------------------------------------------------------------
  trackById(index: number, item: Partial<CabinetProduct>): string {
    // Brief why: Improves *ngFor perf by tracking unique IDs (or index fallback)
    return item.wSKU || index.toString();
  }

  // -----------------------------------------------------------------
  // Helper Methods
  // -----------------------------------------------------------------
  public resetState(): void {
    // Brief why: Clears all runtime state to initial values for fresh component lifecycle
    this.parsedRows = [];
    this.mappedRows = [];
    this.previewRows = [];
    this.isParsing = false;
    this.isDragOver = false;
    this.isImporting = false;
    this.importProgress = 0;
    this.errorMessage = null;
    this.successMessage = null;
    this.importedCount = 0;
  }

  private mapToCabinetProduct(rows: any[]): Partial<CabinetProduct>[] {
    // Brief why: Transforms WooCommerce CSV rows to partial CabinetProduct objects for GraphQL
    // Handles missing fields gracefully; extracts dimensions from Short description, brand/style from Name/Tags
    return rows
      .filter(row => row.SKU) // Skip invalid/empty rows
      .map(row => {
        // Extract brand, style, type from Name (e.g., "Forevermark Champagne Shaker Wall Cabinet 9W X 30H")
        const nameParts = (row.Name || '').match(/^(.*?)\s+(.*?\s+.*?)\s+(.*?\s+Cabinet)\s+(.*)$/i);
        const brand = nameParts?.[1] || 'Forevermark'; // Default to common brand
        const collectionStyle = nameParts?.[2] || ''; // e.g., "Champagne Shaker"
        const doorStyle = collectionStyle.includes('Shaker') ? 'Shaker' : collectionStyle.split(' ').pop() || 'Shaker';

        // Parse size from Name (e.g., "9W X 30H" -> width=9, height=30)
        const sizeMatch = (row.Name || '').match(/(\d+)W\s+X\s+(\d+)H$/i);
        let width = parseFloat(sizeMatch?.[1] || '0');
        let height = parseFloat(sizeMatch?.[2] || '0');

        // Override/enhance with Short description parsing (e.g., "Width: 9 Height: 30 Depth: 12 Door: 1...")
        const shortDesc = row['Short description'] || '';
        const widthMatch = shortDesc.match(/Width:\s*(\d+(?:\.\d+)?)/i);
        const heightMatch = shortDesc.match(/Height:\s*(\d+(?:\.\d+)?)/i);
        const doorMatch = shortDesc.match(/Door:\s*(\d+)/i);
        width = parseFloat(widthMatch?.[1] || width.toString()) || 0;
        height = parseFloat(heightMatch?.[1] || height.toString()) || 0;
        const doors = parseInt(doorMatch?.[1] || '1') || 1;

        // Door style from tags (e.g., "single-door" or "double-door")
        const tags = (row.Tags || '').toLowerCase();
        const tagDoorStyle = tags.includes('double-door') ? 'Double Door' : (tags.includes('single-door') ? 'Single Door' : `${doors} Door`);

        // Price
        const retailPrice = parseFloat(row['Regular price'] || row['Sale price'] || '0') || 0;

        // Weight from CSV
        const weight = parseFloat(row['Weight (lbs)'] || '0') || 0;

        // Image path: first image URL from comma-separated list
        const imagePath = row.Images ? (row.Images.split(',')[0] || '').trim() : '';

        // Assembly from meta
        const assemblyFee = parseFloat(this.extractMeta(row, 'assembly_fee') || '0') || 0;
        const assemblyCost = parseFloat(this.extractMeta(row, 'assembly_cost') || '0') || 0;

        return {
          wSKU: (row.SKU || '').replace(/^AZ-/, 'W-'),
          vSKU: (row.SKU || '').replace(/^AZ-/, 'V-'),
          brand: brand || '',
          doorStyle: tagDoorStyle || doorStyle || '',
          discount: 0,
          costFactor: 1.0,
          assemblyFee: assemblyFee,
          assemblyCost: assemblyCost,
          retailPrice: retailPrice,
          discountPrice: 0, // Calculated in import
          height: height,
          width: width,
          weight: weight,
          species: 'MDF', // Default; extend if meta available
          imagePath: imagePath,
          categories: row.Categories || '',
          tags: row.Tags || '',
          publish: row.Published === '1',
        } as Partial<CabinetProduct>;
      });
  }

  private extractMeta(row: any, key: string): string | undefined {
    // Brief why: Helper to pull custom meta fields from WooCommerce export (format: 'Meta: {key}')
    // Note: May be undefined if row has too few fields
    const metaKey = `Meta: ${key}`;
    return row[metaKey];
  }

  // -----------------------------------------------------------------
  // UI Handlers - User Action Handlers
  // -----------------------------------------------------------------
  // Trigger file input click for browse functionality
  triggerFileSelect(): void {
    if (!this.isParsing && this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  // Handle drag over for visual feedback
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  // Handle drag leave to reset feedback
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  // Handle file drop and parse
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv')) {
        this.onFileUpload({ target: { files: [file] } } as any);
      } else {
        this.errorMessage = 'Please drop a valid CSV file.';
      }
    }
  }

  // Handle CSV file upload and parse
  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.csv')) {
      this.errorMessage = 'Please select a valid CSV file.';
      return;
    }

    this.isParsing = true;
    this.errorMessage = null;

    // Parse CSV using PapaParse (handles large files efficiently)
    Papa.parse(file, {
      header: true, // Use first row as headers
      skipEmptyLines: true,
      dynamicTyping: false, // Treat all as strings to avoid type coercion issues
      complete: (results: Papa.ParseResult<any>) => {
        this.isParsing = false;
        // Ignore 'TooFewFields' errors (common in WooCommerce exports with omitted trailing empties)
        const nonFieldErrors = results.errors.filter(e => e.code !== 'TooFewFields');
        if (nonFieldErrors.length > 0) {
          this.errorMessage = `Parse errors: ${nonFieldErrors[0].message}`;
          return;
        }

        this.parsedRows = results.data.filter(row => row.SKU); // Filter valid rows with SKU
        this.mappedRows = this.mapToCabinetProduct(this.parsedRows); // Apply mapping
        this.previewRows = this.mappedRows.slice(0, 10); // Show first 10 for preview
        this.successMessage = `${this.mappedRows.length} rows mapped successfully from ${this.parsedRows.length} parsed.`;
      },
      error: (error: Error) => {
        this.isParsing = false;
        this.errorMessage = `Failed to parse file: ${error.message}`;
      }
    });
  }

  // Handle bulk import of mapped rows
  async onImportRows(): Promise<void> {
    if (this.importForm.invalid || this.mappedRows.length === 0) {
      this.errorMessage = 'Invalid form or no rows to import.';
      return;
    }

    this.isImporting = true;
    this.importProgress = 0;
    this.importedCount = 0;
    this.errorMessage = null;
    this.successMessage = null;

    const batchSize = 10; // Brief why: Process in small batches to avoid GraphQL limits/overloads
    const defaults = this.importForm.value;

    for (let i = 0; i < this.mappedRows.length; i += batchSize) {
      const batch = this.mappedRows.slice(i, i + batchSize);
      const batchPromises = batch.map(async (row) => {
        try {
          // Calculate discountPrice from retailPrice and default discount
          const discountPrice = (row.retailPrice || 0) * (1 - (defaults.defaultDiscount / 100));

          // Merge defaults (only valid schema fields)
          const input = {
            ...row,
            publish: defaults.defaultPublish ?? row.publish,
            discount: defaults.defaultDiscount ?? (row.discount || 0),
            discountPrice: discountPrice,
          } as Partial<CabinetProduct>;

          // Call GraphQL mutation via service (saves to DB, handles input validation)
          const result = await this.cabinetService.createCabinetProduct(input);
          return result;
        } catch (error: any) {
          console.error(`Error importing row ${row.wSKU}:`, error);
          // Optionally collect errors for display
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      this.importedCount += batchResults.filter(r => r !== null).length;

      // Update progress
      this.importProgress = Math.round((i + batch.length) / this.mappedRows.length * 100);

      // Brief why: Yield to UI thread for smooth progress updates
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    this.isImporting = false;
    if (this.importedCount === this.mappedRows.length) {
      this.successMessage = `Successfully imported ${this.importedCount} rows!`;
    } else {
      this.errorMessage = `Imported ${this.importedCount} of ${this.mappedRows.length} rows. Check console for errors.`;
    }
  }
}
