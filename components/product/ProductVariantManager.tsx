"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Upload, X } from "lucide-react"
import { supabase } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"

interface Attribute {
  name: string
  value: string
}

interface ProductVariant {
  id: string
  name: string
  sku: string
  price: number
  stock_quantity: number
  attributes: Attribute[]
  images: VariantImage[]
  is_active: boolean
}

interface VariantImage {
  id?: string
  url: string
  alt_text?: string
  is_primary: boolean
  order_index: number
}

interface ProductVariantManagerProps {
  productId: string
  initialVariants?: ProductVariant[]
  onSave?: (variants: ProductVariant[]) => void
  readOnly?: boolean
}

export default function ProductVariantManager({
  productId,
  initialVariants = [],
  onSave,
  readOnly = false,
}: ProductVariantManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>(initialVariants)
  const [activeTab, setActiveTab] = useState<string>("0")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (initialVariants.length > 0) {
      setVariants(initialVariants)
    } else {
      // If no variants provided, fetch from database
      fetchVariants()
    }
  }, [productId, initialVariants])

  const fetchVariants = async () => {
    if (!productId) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("product_variants")
        .select(`
          id, name, sku, price, stock_quantity, attributes, is_active,
          product_variant_images (
            id, url, alt_text, is_primary, order_index
          )
        `)
        .eq("product_id", productId)
        .order("name")

      if (error) throw error

      if (data) {
        const formattedVariants = data.map((variant) => ({
          ...variant,
          images: variant.product_variant_images || [],
          attributes: variant.attributes || [],
        }))
        setVariants(formattedVariants)
      }
    } catch (error: any) {
      console.error("Error fetching variants:", error)
      toast({
        title: "Error fetching variants",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddVariant = () => {
    const newVariant: ProductVariant = {
      id: `temp-${Date.now()}`,
      name: `Variant ${variants.length + 1}`,
      sku: "",
      price: 0,
      stock_quantity: 0,
      attributes: [],
      images: [],
      is_active: true,
    }

    setVariants([...variants, newVariant])
    setActiveTab(String(variants.length))
  }

  const handleRemoveVariant = (index: number) => {
    const newVariants = [...variants]
    newVariants.splice(index, 1)
    setVariants(newVariants)

    // Update active tab if needed
    if (Number.parseInt(activeTab) >= newVariants.length) {
      setActiveTab(String(Math.max(0, newVariants.length - 1)))
    }
  }

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: any) => {
    const newVariants = [...variants]
    newVariants[index] = {
      ...newVariants[index],
      [field]: value,
    }
    setVariants(newVariants)
  }

  const handleAddAttribute = (variantIndex: number) => {
    const newVariants = [...variants]
    const currentAttributes = newVariants[variantIndex].attributes || []

    newVariants[variantIndex].attributes = [...currentAttributes, { name: "", value: "" }]

    setVariants(newVariants)
  }

  const handleAttributeChange = (variantIndex: number, attrIndex: number, field: keyof Attribute, value: string) => {
    const newVariants = [...variants]
    newVariants[variantIndex].attributes[attrIndex][field] = value
    setVariants(newVariants)
  }

  const handleRemoveAttribute = (variantIndex: number, attrIndex: number) => {
    const newVariants = [...variants]
    newVariants[variantIndex].attributes.splice(attrIndex, 1)
    setVariants(newVariants)
  }

  const handleAddImage = async (variantIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsLoading(true)

    try {
      const newVariants = [...variants]
      const currentImages = newVariants[variantIndex].images || []
      const isPrimary = currentImages.length === 0

      // In a real app, you would upload the file to storage
      // For demo purposes, we'll just create a local URL
      const file = files[0]
      const fileUrl = URL.createObjectURL(file)

      newVariants[variantIndex].images = [
        ...currentImages,
        {
          url: fileUrl,
          is_primary: isPrimary,
          order_index: currentImages.length,
        },
      ]

      setVariants(newVariants)

      toast({
        title: "Image added",
        description: "The image has been added to the variant.",
      })
    } catch (error: any) {
      console.error("Error adding image:", error)
      toast({
        title: "Error adding image",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveImage = (variantIndex: number, imageIndex: number) => {
    const newVariants = [...variants]
    const removedImage = newVariants[variantIndex].images[imageIndex]
    newVariants[variantIndex].images.splice(imageIndex, 1)

    // If the removed image was primary, set the first remaining image as primary
    if (removedImage.is_primary && newVariants[variantIndex].images.length > 0) {
      newVariants[variantIndex].images[0].is_primary = true
    }

    setVariants(newVariants)
  }

  const handleSetPrimaryImage = (variantIndex: number, imageIndex: number) => {
    const newVariants = [...variants]

    // Set all images as not primary
    newVariants[variantIndex].images.forEach((img, idx) => {
      img.is_primary = idx === imageIndex
    })

    setVariants(newVariants)
  }

  const handleSaveVariants = async () => {
    if (!productId || readOnly) return

    setIsLoading(true)
    try {
      // In a real app, you would save to the database here
      if (onSave) {
        onSave(variants)
      }

      toast({
        title: "Variants saved",
        description: "Product variants have been saved successfully.",
      })
    } catch (error: any) {
      console.error("Error saving variants:", error)
      toast({
        title: "Error saving variants",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && variants.length === 0) {
    return <div className="p-4">Loading variants...</div>
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Product Variants</h3>
        {!readOnly && (
          <Button onClick={handleAddVariant} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Variant
          </Button>
        )}
      </div>

      {variants.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No variants available for this product.</p>
            {!readOnly && (
              <Button onClick={handleAddVariant} className="mt-4">
                <Plus className="h-4 w-4 mr-1" /> Create First Variant
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 w-full overflow-x-auto flex-nowrap">
              {variants.map((variant, index) => (
                <TabsTrigger key={variant.id} value={String(index)} className="flex-shrink-0">
                  {variant.name || `Variant ${index + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>

            {variants.map((variant, index) => (
              <TabsContent key={variant.id} value={String(index)}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{variant.name || `Variant ${index + 1}`}</CardTitle>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveVariant(index)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`variant-name-${index}`}>Variant Name</Label>
                          <Input
                            id={`variant-name-${index}`}
                            value={variant.name}
                            onChange={(e) => handleVariantChange(index, "name", e.target.value)}
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`variant-sku-${index}`}>SKU</Label>
                          <Input
                            id={`variant-sku-${index}`}
                            value={variant.sku}
                            onChange={(e) => handleVariantChange(index, "sku", e.target.value)}
                            disabled={readOnly}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`variant-price-${index}`}>Price</Label>
                          <Input
                            id={`variant-price-${index}`}
                            type="number"
                            value={variant.price}
                            onChange={(e) =>
                              handleVariantChange(index, "price", Number.parseFloat(e.target.value) || 0)
                            }
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`variant-stock-${index}`}>Stock Quantity</Label>
                          <Input
                            id={`variant-stock-${index}`}
                            type="number"
                            value={variant.stock_quantity}
                            onChange={(e) =>
                              handleVariantChange(index, "stock_quantity", Number.parseInt(e.target.value) || 0)
                            }
                            disabled={readOnly}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label>Attributes</Label>
                          {!readOnly && (
                            <Button variant="outline" size="sm" onClick={() => handleAddAttribute(index)}>
                              <Plus className="h-3 w-3 mr-1" /> Add
                            </Button>
                          )}
                        </div>

                        {variant.attributes && variant.attributes.length > 0 ? (
                          <div className="space-y-2">
                            {variant.attributes.map((attr, attrIndex) => (
                              <div key={attrIndex} className="flex items-center gap-2">
                                <Input
                                  placeholder="Name (e.g. Color)"
                                  value={attr.name}
                                  onChange={(e) => handleAttributeChange(index, attrIndex, "name", e.target.value)}
                                  className="flex-1"
                                  disabled={readOnly}
                                />
                                <Input
                                  placeholder="Value (e.g. Red)"
                                  value={attr.value}
                                  onChange={(e) => handleAttributeChange(index, attrIndex, "value", e.target.value)}
                                  className="flex-1"
                                  disabled={readOnly}
                                />
                                {!readOnly && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveAttribute(index, attrIndex)}
                                    className="h-8 w-8 p-0 text-destructive"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No attributes defined.</p>
                        )}
                      </div>

                      <Separator />

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label>Images</Label>
                          {!readOnly && (
                            <div className="relative">
                              <Input
                                type="file"
                                id={`variant-image-upload-${index}`}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                                onChange={(e) => handleAddImage(index, e.target.files)}
                                disabled={isLoading}
                              />
                              <Button variant="outline" size="sm" className="pointer-events-none">
                                <Upload className="h-3 w-3 mr-1" /> Upload
                              </Button>
                            </div>
                          )}
                        </div>

                        {variant.images && variant.images.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2">
                            {variant.images.map((image, imageIndex) => (
                              <div key={imageIndex} className="relative group">
                                <div className="aspect-square rounded-md overflow-hidden border">
                                  <img
                                    src={image.url || "/placeholder.svg"}
                                    alt={image.alt_text || `Variant image ${imageIndex + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                {image.is_primary && <Badge className="absolute top-1 left-1 text-xs">Primary</Badge>}
                                {!readOnly && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!image.is_primary && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSetPrimaryImage(index, imageIndex)}
                                        className="text-white h-8"
                                      >
                                        Set Primary
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveImage(index, imageIndex)}
                                      className="text-white h-8 w-8"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No images uploaded.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {!readOnly && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSaveVariants} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Variants"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
