package com.pos.service.impl;

import com.pos.dto.ProductRequest;
import com.pos.model.Product;
import com.pos.repository.ProductRepository;
import com.pos.service.MinIOService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ProductService {

    @Autowired
    private ProductRepository repository;

    @Autowired
    MinIOService minIOService;

    public ResponseEntity<?> createProduct(ProductRequest request, MultipartFile imageFile) throws Exception {

        String objectKey = minIOService.uploadFile(imageFile);

        Product product = Product.builder()
                .name(request.name())
                .price(request.price())
                .active(Boolean.TRUE.equals(request.active()))
                .discount(request.discount())
                .imageURL(objectKey)
                .quantity(request.quantity())
                .category(request.category())
                .build();
        return ResponseEntity.ok(repository.save(product));

    }
    //get product


    public Product getProductById(long id) {
        return repository.getProductById(id);
    }


    //update product

    public void updateProduct(long id, ProductRequest request) {

        Product product = repository.getProductById(id);
        if (product == null) {
            log.warn("Product not available!");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        product.setName(request.name());
        product.setPrice(request.price());
        product.setActive(Boolean.TRUE.equals(request.active()));
        product.setDiscount(request.discount());
        product.setQuantity(request.quantity());
        product.setCategory(request.category());

        repository.save(product);
        log.info("Product updated successfully");
    }
    //delete product

    public void deleteProduct(long id) {
        if (repository.getProductById(id) == null) {
            log.warn("Product not available");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        } else {
            repository.deleteById(id);
            log.warn("Product deleted successfully");
        }
    }

    //return all products

    public List<Product> findAllProducts() {
        return repository.findAll();
    }

    public byte[] getImageByProductId(int productId) throws Exception {
        Product product = getProductById(productId);
        return minIOService.getFile(product.getImageURL());
    }

}
