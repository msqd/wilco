import { useQuery } from "@tanstack/react-query"

export interface BundleInfo {
  name: string
}

export interface JsonSchemaProperty {
  type: "string" | "number" | "boolean" | "array" | "object"
  title?: string
  description?: string
  default?: unknown
  minimum?: number
  maximum?: number
  minItems?: number
  maxItems?: number
  items?: JsonSchemaProperty
  format?: string
}

export interface PropsSchema {
  type: "object"
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
}

export interface BundleMetadata {
  title?: string
  description?: string
  props?: PropsSchema
}

async function fetchBundles(): Promise<BundleInfo[]> {
  const response = await fetch("/api/bundles")
  if (!response.ok) {
    throw new Error("Failed to fetch bundles")
  }
  return response.json()
}

async function fetchBundleMetadata(name: string): Promise<BundleMetadata> {
  const response = await fetch(`/api/bundles/${name}/metadata`)
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata for ${name}`)
  }
  return response.json()
}

async function fetchBundleCode(name: string): Promise<string> {
  const response = await fetch(`/api/bundles/${name}.js`)
  if (!response.ok) {
    throw new Error(`Failed to fetch bundle ${name}`)
  }
  return response.text()
}

export function useBundles() {
  return useQuery({
    queryKey: ["bundles"],
    queryFn: fetchBundles,
    staleTime: 30_000,
  })
}

export function useBundleMetadata(name: string | null) {
  return useQuery({
    queryKey: ["bundle-metadata", name],
    queryFn: () => fetchBundleMetadata(name!),
    enabled: !!name,
    staleTime: 60_000,
  })
}

export function useBundleCode(name: string | null) {
  return useQuery({
    queryKey: ["bundle-code", name],
    queryFn: () => fetchBundleCode(name!),
    enabled: !!name,
    staleTime: 60_000,
  })
}
