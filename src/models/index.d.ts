import { ModelInit, MutableModel, __modelMeta__, ManagedIdentifier } from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled } from "@aws-amplify/datastore";





type EagerCabinetProduct = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<CabinetProduct, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly wSKU: string;
  readonly vSKU: string;
  readonly brand: string;
  readonly doorStyle: string;
  readonly discount?: number | null;
  readonly costFactor?: number | null;
  readonly assemblyFee?: number | null;
  readonly assemblyCost?: number | null;
  readonly retailPrice?: number | null;
  readonly discountPrice?: number | null;
  readonly height?: number | null;
  readonly width?: number | null;
  readonly weight?: number | null;
  readonly species?: string | null;
  readonly imagePath?: string | null;
  readonly categories?: string | null;
  readonly tags?: string | null;
  readonly publish?: boolean | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyCabinetProduct = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<CabinetProduct, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly wSKU: string;
  readonly vSKU: string;
  readonly brand: string;
  readonly doorStyle: string;
  readonly discount?: number | null;
  readonly costFactor?: number | null;
  readonly assemblyFee?: number | null;
  readonly assemblyCost?: number | null;
  readonly retailPrice?: number | null;
  readonly discountPrice?: number | null;
  readonly height?: number | null;
  readonly width?: number | null;
  readonly weight?: number | null;
  readonly species?: string | null;
  readonly imagePath?: string | null;
  readonly categories?: string | null;
  readonly tags?: string | null;
  readonly publish?: boolean | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type CabinetProduct = LazyLoading extends LazyLoadingDisabled ? EagerCabinetProduct : LazyCabinetProduct

export declare const CabinetProduct: (new (init: ModelInit<CabinetProduct>) => CabinetProduct) & {
  copyOf(source: CabinetProduct, mutator: (draft: MutableModel<CabinetProduct>) => MutableModel<CabinetProduct> | void): CabinetProduct;
}