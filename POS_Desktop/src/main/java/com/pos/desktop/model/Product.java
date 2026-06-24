package com.pos.desktop.model;

public record Product(long id,
					  String name,
					  Double price,
					  boolean active,
					  String imageURL,
					  double discount,
					  int quantity) {
}
