package com.pos.controller;


import com.pos.dto.ProductRequest;
import com.pos.model.Product;
import com.pos.service.impl.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLConnection;
import java.util.Collections;
import java.util.List;

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
                                           @RequestParam("file") MultipartFile imageFile) throws Exception {

        ProductRequest request = new ProductRequest(name, price, active, discount, quantity, category);

        return ResponseEntity.ok(productService.createProduct(request, imageFile));
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

    //update product
    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.CREATED)
    public void updateProduct(@PathVariable long id, @RequestBody ProductRequest request) {
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
                                                    @RequestParam(value = "file", required = false) MultipartFile imageFile) throws Exception {

        ProductRequest request = new ProductRequest(name, price, active, discount, quantity, category);
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

        Product product = productService.getProductById(id);
        byte[] imageFile = productService.getImageByProductId(id);
        String guessedType = URLConnection.guessContentTypeFromName(product.getImageURL());

        return ResponseEntity.ok()
                .contentType(guessedType != null ? MediaType.valueOf(guessedType) : MediaType.APPLICATION_OCTET_STREAM)
                .body(imageFile);

    }

    // temporary placeholder until stock movement tracking is implemented
    @GetMapping("/{id}/stock-movements")
    public ResponseEntity<List<?>> getStockMovements(@PathVariable long id) {
        productService.getProductById(id); // ensure product exists; will 404/400 if not
        return ResponseEntity.ok(Collections.emptyList());
    }
}



