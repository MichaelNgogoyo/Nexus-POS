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
                              @RequestParam("file") MultipartFile imageFile) throws IOException {

        ProductRequest request = new ProductRequest(name, price, active, discount, quantity);

        return ResponseEntity.ok(productService.createProduct(request, imageFile));
    }

    //get one product
    @GetMapping("/{id}")
    public Product findById(@PathVariable long id) {
        return productService.getProductById(id);
    }

    //return all products
    @GetMapping
    public List<Product> productsList() {
        return productService.findAllProducts();
    }

    //update product
    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.CREATED)
    public void updateProduct(@RequestBody @PathVariable long id, ProductRequest request) {
        productService.updateProduct(id, request);
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
        return ResponseEntity.ok()
                .contentType(MediaType.valueOf(product.getImageType()))
                .body(imageFile);

    }
}
