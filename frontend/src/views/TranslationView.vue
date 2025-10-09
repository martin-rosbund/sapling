<template>
  <sapling-header />
  <v-data-table :items="items"></v-data-table>
  <sapling-footer />
</template>

<script lang="ts">
  import { defineComponent } from 'vue';
  import SaplingFooter from '@/components/SaplingFooter.vue';
  import SaplingHeader from '@/components/SaplingHeader.vue';

  export default defineComponent({
    name: 'CompanyView',
      components: {
      SaplingHeader,
      SaplingFooter
    }
  });
</script>

<script lang="ts" setup>
  const items = [
    {
      name: 'Afrikanischer Elefant',
      species: 'Loxodonta africana',
      diet: 'Pflanzenfresser',
      habitat: 'Savanne, Wälder',
    },
    {
      name: 'Sibirischer Tiger',
      species: 'Panthera tigris altaica',
      diet: 'Fleischfresser',
      habitat: 'Wälder, Taiga',
    },
    {
      name: 'Kaiserpinguin',
      species: 'Aptenodytes forsteri',
      diet: 'Fischfresser',
      habitat: 'Antarktis',
    },
    {
      name: 'Blauwal',
      species: 'Balaenoptera musculus',
      diet: 'Planktonfresser',
      habitat: 'Ozeane',
    },
    {
      name: 'Rothirsch',
      species: 'Cervus elaphus',
      diet: 'Pflanzenfresser',
      habitat: 'Wälder, Wiesen',
    },
    {
      name: 'Wüstenfuchs',
      species: 'Vulpes zerda',
      diet: 'Allesfresser',
      habitat: 'Wüsten',
    },
    {
      name: 'Grüner Leguan',
      species: 'Iguana iguana',
      diet: 'Pflanzenfresser',
      habitat: 'Regenwälder',
    },
    {
      name: 'Königskobra',
      species: 'Ophiophagus hannah',
      diet: 'Fleischfresser',
      habitat: 'Wälder, Dschungel',
    },
    {
      name: 'Panda',
      species: 'Ailuropoda melanoleuca',
      diet: 'Pflanzenfresser',
      habitat: 'Bambuswälder',
    },
    {
      name: 'Grauwolf',
      species: 'Canis lupus',
      diet: 'Allesfresser',
      habitat: 'Wälder, Tundra',
    },
    {
      name: 'Flamingo',
      species: 'Phoenicopterus roseus',
      diet: 'Planktonfresser',
      habitat: 'Feuchtgebiete, Seen',
    },
    {
      name: 'Koala',
      species: 'Phascolarctos cinereus',
      diet: 'Pflanzenfresser',
      habitat: 'Eukalyptuswälder',
    },
    {
      name: 'Schneeleopard',
      species: 'Panthera uncia',
      diet: 'Fleischfresser',
      habitat: 'Gebirge',
    },
    {
      name: 'Gepard',
      species: 'Acinonyx jubatus',
      diet: 'Fleischfresser',
      habitat: 'Savanne',
    },
    {
      name: 'Faultier',
      species: 'Bradypus tridactylus',
      diet: 'Pflanzenfresser',
      habitat: 'Regenwälder',
    },
    {
      name: 'Erdmännchen',
      species: 'Suricata suricatta',
      diet: 'Allesfresser',
      habitat: 'Savanne, Halbwüsten',
    },
    {
      name: 'Orang-Utan',
      species: 'Pongo pygmaeus',
      diet: 'Allesfresser',
      habitat: 'Regenwälder',
    },
    {
      name: 'Känguru',
      species: 'Macropus giganteus',
      diet: 'Pflanzenfresser',
      habitat: 'Grasland, Wälder',
    },
    {
      name: 'Seepferdchen',
      species: 'Hippocampus',
      diet: 'Planktonfresser',
      habitat: 'Küstengewässer',
    },
    {
      name: 'Eisbär',
      species: 'Ursus maritimus',
      diet: 'Fleischfresser',
      habitat: 'Arktis',
    }
  ]
</script>