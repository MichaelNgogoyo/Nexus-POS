package com.pos.service.impl;

import com.pos.model.Product;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestParam;

@Service
public class CheckoutService {

    @Autowired
    private ProductService productService;

    @Autowired
    private SalesService salesService;
    //process checkout
    public void processCheckout(@RequestParam long id){


        Product product = productService.getProductById(id);


        //validate the product exists
        if (productService.getProductById(id).getQuantity()>0){
            int quantity = productService.findAllProducts().size();
            quantity = quantity -1;
        }

    }
}
