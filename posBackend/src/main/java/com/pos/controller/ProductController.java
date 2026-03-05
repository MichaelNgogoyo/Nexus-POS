package com.pos.controller;


import com.pos.dto.ProductRequest;
import com.pos.dto.StockAdjustmentRequest;
import com.pos.model.Product;
import com.pos.model.StockMovement;
import com.pos.service.impl.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLConnection;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.springframework.data.domain.Page;

@Slf4j
@RestController
@RequestMapping("/api/product")
@RequiredArgsConstructor
public class ProductController {

    @Autowired
    private ProductService productService;


    @PostMapping(value = "/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createProduct(@RequestParam("name") String name,
                                           @RequestParam("price") Double price,
                                           @RequestParam("active") Boolean active,
                                           @RequestParam("discount") double discount,
                                           @RequestParam("quantity") int quantity,
                                           @RequestParam(value = "category", required = false) String category,
                                           @RequestParam(value = "sku", required = false) String sku,
                                           @RequestParam(value = "barcode", required = false) String barcode,
                                           @RequestParam("file") MultipartFile imageFile) throws Exception {

        if (imageFile == null || imageFile.isEmpty()) {
            return ResponseEntity.badRequest().body("Image file is required");
        }

        ProductRequest request = new ProductRequest(name, price, active, discount, quantity, category, sku, barcode, null);

        return ResponseEntity.ok(productService.createProduct(request, imageFile));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<Product>> getLowStockProducts() {
        return ResponseEntity.ok(productService.getLowStockProducts());
    }

    //get one product
    @GetMapping("/{id}")
    public Product findById(@PathVariable long id) {
        return productService.getProductById(id);
    }

    //return all products
    @GetMapping({"", "/", "/."})
    public List<Product> productsList() {
        return productService.findAllProducts();
    }

    /** Paginated + searchable product list for checkout. GET /api/product/search?q=milk&page=0&size=12 */
    @GetMapping("/search")
    public ResponseEntity<Page<Product>> searchProducts(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(productService.searchProducts(q, page, size));
    }

    //update product
    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.CREATED)
    public void updateProduct(@PathVariable long id, @Valid @RequestBody ProductRequest request) {
        productService.updateProduct(id, request);
    }

    @PutMapping(value = "/{id}/with-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateProductWithImage(@PathVariable long id,
                                                    @RequestParam("name") String name,
                                                    @RequestParam("price") Double price,
                                                    @RequestParam("active") Boolean active,
                                                    @RequestParam("discount") double discount,
                                                    @RequestParam("quantity") int quantity,
                                                    @RequestParam(value = "category", required = false) String category,
                                                    @RequestParam(value = "sku", required = false) String sku,
                                                    @RequestParam(value = "barcode", required = false) String barcode,
                                                    @RequestParam(value = "file", required = false) MultipartFile imageFile) throws Exception {

        ProductRequest request = new ProductRequest(name, price, active, discount, quantity, category, sku, barcode, null);
        return productService.updateProductWithImage(id, request, imageFile);
    }

    //delete product
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(@PathVariable long id) {
        productService.deleteProduct(id);
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> getProductImageById(@PathVariable int id) throws Exception {
        byte[] imageFile = productService.getImageByProductId(id);
        Product product = productService.getProductById(id);
        String guessedType = URLConnection.guessContentTypeFromName(product.getImageURL());

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic())
                .contentType(guessedType != null ? MediaType.valueOf(guessedType) : MediaType.APPLICATION_OCTET_STREAM)
                .body(imageFile);

    }

    @PostMapping("/{id}/stock-adjustment")
    public ResponseEntity<Product> adjustStock(@PathVariable long id, @Valid @RequestBody StockAdjustmentRequest request) {
        Product updated = productService.adjustStock(id, request.delta(), request.reason());
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{id}/stock-movements")
    public ResponseEntity<List<StockMovement>> getStockMovements(@PathVariable long id) {
        return ResponseEntity.ok(productService.getStockMovements(id));
    }
}



