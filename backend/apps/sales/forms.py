from django import forms
from apps.sales.models import Coupon
from apps.catalog.models import Brand, Category

class CouponAdminForm(forms.ModelForm):
    brand_filter = forms.ModelChoiceField(
        queryset=Brand.objects.all(),
        required=False,
        label="Brand",
        help_text="Select a brand"
    )
    category_filter = forms.ModelChoiceField(
        queryset=Category.objects.all(),
        required=False,
        label="Category",
        help_text="Select a category (e.g. Eyeglasses, Sunglasses)"
    )

    class Meta:
        model = Coupon
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            brands = self.instance.brands.all()
            if brands.exists():
                self.fields['brand_filter'].initial = brands.first()
            
            categories = self.instance.categories.all()
            if categories.exists():
                self.fields['category_filter'].initial = categories.first()

    def save(self, commit=True):
        # We need to save the model and then update M2M
        instance = super().save(commit=False)
        if commit:
            instance.save()
            self.save_m2m() # default django m2m handling

        brand = self.cleaned_data.get('brand_filter')
        category = self.cleaned_data.get('category_filter')

        if commit:
            if brand:
                instance.brands.set([brand])
            else:
                instance.brands.clear()
                
            if category:
                instance.categories.set([category])
            else:
                instance.categories.clear()

        return instance
