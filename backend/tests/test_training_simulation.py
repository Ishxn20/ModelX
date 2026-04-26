from api.training_simulation import _split_label_from_training_plan


def test_split_label_uses_train_val_test_percentages_from_training_plan():
    plan = (
        "Perform stratified splits into training (70%), validation (15%), "
        "and test (15%) sets."
    )

    assert _split_label_from_training_plan(plan) == "train / val / test  70 · 15 · 15 split"


def test_split_label_supports_ratio_shorthand():
    plan = "Use a train/validation/test 60/20/20 split before model fitting."

    assert _split_label_from_training_plan(plan) == "train / val / test  60 · 20 · 20 split"


def test_split_label_omits_numbers_when_plan_has_no_percentages():
    plan = "Create train, validation, and test sets before training."

    assert _split_label_from_training_plan(plan) == "train / val / test split"
