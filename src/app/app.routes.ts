import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'product',
    loadComponent: () => import('./product/cabinet-product/cabinet-product.component')
      .then(m => m.CabinetProductComponent),
    title: 'Dashboard',
  },
  {
    path: 'import',
    loadComponent: () => import('./product/csv-import/csv-import.component')
      .then(m => m.CsvImportComponent),
    title: 'Dashboard',
  },
  {
    path: 'list',
    loadComponent: () => import('./product/product-list/cabinet-product-list/cabinet-product-list.component')
      .then(m => m.CabinetProductListComponent),
    title: 'Dashboard',
  },
];
