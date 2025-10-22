<template>
  <v-app>
    <v-main>
      <v-container class="py-8 px-6" fluid>
        <v-row>
          <v-col v-for="card in cards" :key="card" cols="12">
            <v-card>
              <v-list lines="two">
                <v-list-subheader :title="card"></v-list-subheader>
                <template v-for="n in 4" :key="n">
                  <v-list-item title="test" subtitle="test">
                    <template v-slot:prepend>
                      <v-avatar color="grey-darken-1"></v-avatar>
                    </template>
                  </v-list-item>
                  <v-divider
                    v-if="n !== 6"
                    :key="`divider-${n}`"
                    inset
                  ></v-divider>
                </template>
              </v-list>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
  <!-- Inbox view with cards for Today and Yesterday -->
</template>

<script setup lang="ts">
// Cards for grouping inbox items
const cards = ['Today', 'Yesterday']
</script>
