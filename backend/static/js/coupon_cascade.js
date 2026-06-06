document.addEventListener('DOMContentLoaded', function() {
    var brandSelect = document.getElementById('id_brand_filter');
    var categorySelect = document.getElementById('id_category_filter');
    var subcategorySelect = document.getElementById('id_subcategory_filter');

    if (!brandSelect || !categorySelect || !subcategorySelect) {
        return;
    }

    function fetchCategories(brandId) {
        if (!brandId) {
            categorySelect.innerHTML = '<option value="" selected>---------</option>';
            subcategorySelect.innerHTML = '<option value="" selected>---------</option>';
            return;
        }

        fetch('/api/catalog/categories/categories_by_brand/?brand_id=' + brandId)
            .then(response => response.json())
            .then(data => {
                var currentVal = categorySelect.value;
                categorySelect.innerHTML = '<option value="">---------</option>';
                var hasCurrent = false;
                data.forEach(function(cat) {
                    var option = document.createElement('option');
                    option.value = cat.id;
                    option.text = cat.name;
                    categorySelect.appendChild(option);
                    if (cat.id == currentVal) hasCurrent = true;
                });
                if (hasCurrent) {
                    categorySelect.value = currentVal;
                } else {
                    categorySelect.value = '';
                    fetchSubcategories('');
                }
            })
            .catch(err => console.error(err));
    }

    function fetchSubcategories(categoryId) {
        if (!categoryId) {
            subcategorySelect.innerHTML = '<option value="" selected>---------</option>';
            return;
        }

        fetch('/api/catalog/categories/children/?parent_id=' + categoryId)
            .then(response => response.json())
            .then(data => {
                var currentVal = subcategorySelect.value;
                subcategorySelect.innerHTML = '<option value="">---------</option>';
                var hasCurrent = false;
                data.forEach(function(subcat) {
                    var option = document.createElement('option');
                    option.value = subcat.id;
                    option.text = subcat.name;
                    subcategorySelect.appendChild(option);
                    if (subcat.id == currentVal) hasCurrent = true;
                });
                if (hasCurrent) {
                    subcategorySelect.value = currentVal;
                } else {
                    subcategorySelect.value = '';
                }
            })
            .catch(err => console.error(err));
    }

    brandSelect.addEventListener('change', function() {
        fetchCategories(this.value);
    });

    categorySelect.addEventListener('change', function() {
        fetchSubcategories(this.value);
    });

    // Initial load logic (only if editing an existing coupon and brand is pre-selected)
    // The Python form will set initial options, but we can rely on standard HTML for initial render.
});
