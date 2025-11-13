package com.pos.service.impl;

import com.pos.dto.ProductRequest;
import com.pos.model.Product;
import com.pos.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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

    //create product

    public void createProduct(ProductRequest request, MultipartFile imageFile) throws IOException {

        Product product = Product.builder().
                name(request.name()).
                price(request.price())
                .active(request.active())
                .discount(request.discount())
                .quantity(request.quantity())
                .build();

        product.setImageName(imageFile.getOriginalFilename());
        product.setImageType(imageFile.getContentType());
        product.setImageData(imageFile.getBytes());


        repository.save(product);

    }
    //get product


    public Product getProductById(long id) {
        return repository.getProductById(id);
    }


    //update product

    public void updateProduct(long id, ProductRequest request) {

        if (repository.getProductById(id) == null) {
            log.warn("Product not available!");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        } else {

            Product product = repository.getProductById(id);
            product.setName(request.name());
            product.setPrice(request.price());

            repository.save(product);
            log.info("Product updated successfully");
        }

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

    public ResponseEntity<byte[]> getImageByProductId(int productId) {
        Product product = getProductById(productId);

        byte[] imageFile = product.getImageData();

        log.info(imageFile.toString());
        return ResponseEntity.ok()
                .contentType(MediaType.valueOf(product.getImageType()))
                .body(imageFile);

    }

}
