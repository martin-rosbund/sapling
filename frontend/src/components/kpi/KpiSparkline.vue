<template>
  <div v-if="value.length === 0" class="text-caption text-grey">{{ $t('global.noData') }}</div>
  <div v-else>
    <v-sparkline
      :auto-line-width="autoLineWidth"
      :fill="fill"
      :gradient="gradient"
      :gradient-direction="gradientDirection"
      :line-width="width"
      :model-value="value"
      :padding="padding"
      :smooth="radius || false"
      :stroke-linecap="lineCap"
      :type="type"
      style="max-height: 105px;"
      auto-draw
    ></v-sparkline>
    <div class="d-flex justify-space-between mt-1 text-caption">
      <span v-if="firstLabel">{{ firstLabel }}: {{ firstValue }}</span>
      <span v-if="lastLabel">{{ lastLabel }}: {{ lastValue }}</span>
    </div>
  </div>
</template>

<script lang="ts">
  const gradients = [
    ['#f72047', '#ffd200', '#1feaea']
  ]

  export default {
    props: {
      data: {
        type: Array,
        default: () => [],
      },
    },
    data() {
      return {
        width: 3,
        radius: 10,
        padding: 8,
        lineCap: 'round',
        gradient: gradients[0],
        gradientDirection: 'top',
        gradients,
        fill: false,
        type: 'trend',
        autoLineWidth: false,
      };
    },
    computed: {
      value() {
        // Map incoming data to array of values for sparkline
        if (Array.isArray(this.data) && this.data.length && typeof this.data[0] === 'object' && 'value' in this.data[0]) {
          return this.data.map(d => d.value);
        }
        // fallback
        return [];
      },
        firstValue() {
          if (this.value.length > 0) return this.value[0];
          return null;
        },
        lastValue() {
          if (this.value.length > 0) return this.value[this.value.length - 1];
          return null;
        },
        firstLabel() {
          if (Array.isArray(this.data) && this.data.length > 0) {
            const d = this.data[0];
            if ('day' in d && 'month' in d && 'year' in d) return `${d.day}.${d.month}/${d.year}`;
            if ('month' in d && 'year' in d) return `${d.month}/${d.year}`;
          }
          return null;
        },
        lastLabel() {
          if (Array.isArray(this.data) && this.data.length > 0) {
            const d = this.data[this.data.length - 1];
            if ('day' in d && 'month' in d && 'year' in d) return `${d.day}.${d.month}/${d.year}`;
            if ('month' in d && 'year' in d) return `${d.month}/${d.year}`;
          }
          return null;
        },
    },
  }
</script>