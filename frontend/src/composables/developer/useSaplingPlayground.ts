import { ref } from "vue";

export function useSaplingPlayground() {
  // #region State
  const booleanFieldValue = ref(true);
  const colorFieldValue = ref('#000000');
  const shortTextFieldValue = ref('');
  const longTextFieldValue = ref('');
  const numberFieldValue = ref<number | null>(null);
  const dateTypeFieldValue = ref<string | null>(null);
  const timeFieldValue = ref<string | null>(null);
  const dateTimeDateValue = ref('');
  const dateTimeTimeValue = ref('');
  const phoneFieldValue = ref('');
  const mailFieldValue = ref('');
  const linkFieldValue = ref('');
  const iconFieldItems = ref([
    { name: 'mdi-home' },
    { name: 'mdi-account' },
    { name: 'mdi-email' },
    { name: 'mdi-phone' },
    { name: 'mdi-link-variant' }
  ]);
  const iconFieldValue = ref('mdi-home');
  // #endregion

  function setBooleanFieldValue(value: boolean) {
    booleanFieldValue.value = value;
  }

  function setColorFieldValue(value: string) {
    colorFieldValue.value = value;
  }

  function setShortTextFieldValue(value: string) {
    shortTextFieldValue.value = value;
  }

  function setLongTextFieldValue(value: string) {
    longTextFieldValue.value = value;
  }

  function setNumberFieldValue(value: number | null) {
    numberFieldValue.value = value;
  }

  function setDateTypeFieldValue(value: string | null) {
    dateTypeFieldValue.value = value;
  }

  function setTimeFieldValue(value: string | null) {
    timeFieldValue.value = value;
  }

  function setDateTimeDateValue(value: string) {
    dateTimeDateValue.value = value;
  }

  function setDateTimeTimeValue(value: string) {
    dateTimeTimeValue.value = value;
  }

  function setPhoneFieldValue(value: string) {
    phoneFieldValue.value = value;
  }

  function setMailFieldValue(value: string) {
    mailFieldValue.value = value;
  }

  function setLinkFieldValue(value: string) {
    linkFieldValue.value = value;
  }

  function setIconFieldValue(value: string) {
    iconFieldValue.value = value;
  }

  return {
    booleanFieldValue,
    setBooleanFieldValue,
    colorFieldValue,
    setColorFieldValue,
    shortTextFieldValue,
    setShortTextFieldValue,
    longTextFieldValue,
    setLongTextFieldValue,
    numberFieldValue,
    setNumberFieldValue,
    dateTypeFieldValue,
    setDateTypeFieldValue,
    timeFieldValue,
    setTimeFieldValue,
    dateTimeDateValue,
    setDateTimeDateValue,
    dateTimeTimeValue,
    setDateTimeTimeValue,
    phoneFieldValue,
    setPhoneFieldValue,
    mailFieldValue,
    setMailFieldValue,
    linkFieldValue,
    setLinkFieldValue,
    iconFieldItems,
    iconFieldValue,
    setIconFieldValue
  };
}
